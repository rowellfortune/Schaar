import React, { useState, useEffect, useRef } from 'react';

// --- STYLING (Inline voor gemak) ---
const styles = {
  container: { fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', maxWidth: '600px', margin: '40px auto', padding: '20px', textAlign: 'center', backgroundColor: '#f9f9f9', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' },
  statusBadge: (connected) => ({ padding: '8px 15px', borderRadius: '20px', backgroundColor: connected ? '#d4edda' : '#f8d7da', color: connected ? '#155724' : '#721c24', fontSize: '0.9em', marginBottom: '20px', display: 'inline-block' }),
  weightDisplay: { display: 'flex', justifyContent: 'space-around', margin: '30px 0' },
  card: (active) => ({ padding: '20px', border: `2px solid ${active ? '#007bff' : '#eee'}`, borderRadius: '10px', backgroundColor: active ? '#fff' : '#f1f1f1', width: '40%', transition: 'all 0.3s' }),
  resultBox: { marginTop: '30px', padding: '20px', backgroundColor: '#007bff', color: 'white', borderRadius: '10px', fontSize: '1.5em', fontWeight: 'bold' },
  button: { padding: '12px 24px', fontSize: '1em', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', transition: 'background 0.3s' },
  resetBtn: { marginTop: '15px', background: 'none', border: '1px solid white', color: 'white', cursor: 'pointer', padding: '5px 10px', borderRadius: '4px' }
};

export default function App() {
  const [connected, setConnected] = useState(false);
  const [droog, setDroog] = useState(null);
  const [nat, setNat] = useState(null);
  const [resultaat, setResultaat] = useState(null);
  const portRef = useRef(null);

  // De formule: (nat / droog * 2307.454) - 2088.136
  const bereken = (d, n) => ((n / d) * 2307.454) - 2088.136;

  const connectSerial = async () => {
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      portRef.current = port;
      setConnected(true);
      leesData();
    } catch (err) {
      console.error("Verbinding mislukt:", err);
    }
  };

  const slaOpInDatabase = async (droog, nat, percentage) => {
  try {
    const response = await fetch('http://localhost:3001/opslaan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ droog, nat, percentage })
    });
    const data = await response.json();
    console.log(data.message);
  } catch (error) {
    console.error("Fout bij opslaan:", error);
  }
};


  const leesData = async () => {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = portRef.current.readable.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable.getReader();

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          // Haal getal uit de A&D string: "ST,+00123.45  g"
          const gewicht = parseFloat(value.replace(/[^\d.-]/g, ''));
          if (!isNaN(gewicht) && gewicht > 0.1) {
            verwerkMeting(gewicht);
          }
        }
      }
    } catch (err) {
      console.error("Fout bij lezen:", err);
      setConnected(false);
    }
  };

  const verwerkMeting = (g) => {
    // We gebruiken functionele updates om de juiste state te vangen
    setDroog(prevDroog => {
      if (prevDroog === null) return g;
      setNat(prevNat => {
        if (prevNat === null) {
          const res = bereken(prevDroog, g);
          setResultaat(res.toFixed(3));
          return g;
        }
        return prevNat;
      });
      return prevDroog;
    });
  };

  const reset = () => {
    setDroog(null);
    setNat(null);
    setResultaat(null);
  };

  return (
    <div style={styles.container}>
      <h2>⚖️ A&D Precision App</h2>
      <div style={styles.statusBadge(connected)}>
        {connected ? '● Weegschaal Verbonden' : '○ Geen verbinding'}
      </div>

      {!connected && (
        <button onClick={connectSerial} style={styles.button}>Verbind via USB</button>
      )}

      <div style={styles.weightDisplay}>
        <div style={styles.card(droog !== null && nat === null)}>
          <small>STAP 1</small>
          <h4>Droog</h4>
          <p style={{fontSize: '1.2em'}}>{droog ? `${droog} g` : '---'}</p>
        </div>
        <div style={styles.card(droog !== null && nat === null)}>
          <small>STAP 2</small>
          <h4>Nat</h4>
          <p style={{fontSize: '1.2em'}}>{nat ? `${nat} g` : '---'}</p>
        </div>
      </div>

      {resultaat && (
        <div style={styles.resultBox}>
          <div>{resultaat} %</div>
          <button onClick={reset} style={styles.resetBtn}>Nieuwe meting</button>
        </div>
      )}

      <p style={{marginTop: '20px', fontSize: '0.8em', color: '#666'}}>
        Zorg dat de weegschaal op <strong>Auto-Print</strong> staat.
      </p>
    </div>
  );
}