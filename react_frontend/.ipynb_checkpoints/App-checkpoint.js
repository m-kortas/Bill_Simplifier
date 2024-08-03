import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
      setError("File size exceeds 10MB limit.");
      setFile(null);
    } else {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setAnalysis(null);
    setProgress(0);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:3005/api/analyze/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000,  // Increase to 3 minutes
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        }
      });
      setAnalysis(response.data);
    } catch (error) {
      if (error.response) {
        setError(`Error: ${error.response.data.detail || 'Unknown error'}`);
      } else if (error.request) {
        setError('No response received from server.');
      } else {
        setError(`Error: ${error.message}`);
      }
      console.error('Error analyzing file:', error);
    } finally {
      setLoading(false);
    }
  };

  // Inline styles
  const styles = {
    app: {
      textAlign: 'center',
      padding: '20px',
    },
    uploadForm: {
      marginBottom: '20px',
    },
    input: {
      marginRight: '10px',
    },
    button: {
      padding: '10px 20px',
      fontSize: '16px',
    },
    buttonDisabled: {
      backgroundColor: 'grey',
      cursor: 'not-allowed',
    },
    error: {
      color: 'red',
      fontWeight: 'bold',
    },
    results: {
      textAlign: 'left',
      maxWidth: '800px',
      margin: '0 auto',
    },
    resultsTitle: {
      color: '#333',
    },
    list: {
      listStyleType: 'disc',
      paddingLeft: '20px',
    },
    progressBar: {
      width: '100%',
      backgroundColor: '#e0e0e0',
      borderRadius: '5px',
      margin: '10px 0',
    },
    progressFill: {
      height: '20px',
      backgroundColor: '#4CAF50',
      borderRadius: '5px',
      textAlign: 'center',
      lineHeight: '20px',
      color: 'white',
    },
  };

  return (
    <div style={styles.app}>
      <h1>Australian Parliamentary Bill Analyzer</h1>
      <form onSubmit={handleSubmit} style={styles.uploadForm}>
        <input 
          type="file" 
          onChange={handleFileChange} 
          accept=".pdf" 
          style={styles.input} 
        />
        <button 
          type="submit" 
          disabled={!file || loading} 
          style={!file || loading ? styles.buttonDisabled : styles.button}
        >
          {loading ? 'Analyzing...' : 'Analyze Bill'}
        </button>
      </form>
      {loading && (
        <div style={styles.progressBar}>
          <div style={{...styles.progressFill, width: `${progress}%`}}>
            {progress}%
          </div>
        </div>
      )}
      {error && <p style={styles.error}>{error}</p>}
      {analysis && (
        <div style={styles.results}>
          <h2 style={styles.resultsTitle}>Analysis Results</h2>
          <h3>Summary</h3>
          <p>{analysis.summary}</p>
          <h3>Key Points</h3>
          <ul style={styles.list}>
            {analysis.key_points.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
          <h3>Arguments For</h3>
          <ul style={styles.list}>
            {analysis.arguments_for.map((arg, index) => (
              <li key={index}>{arg}</li>
            ))}
          </ul>
          <h3>Arguments Against</h3>
          <ul style={styles.list}>
            {analysis.arguments_against.map((arg, index) => (
              <li key={index}>{arg}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;