import React, { useState } from 'react';
import axios from 'axios';
import './App.css'; // We'll create this file for styling

function App() {
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.size > 10 * 1024 * 1024) {
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
        timeout: 300000,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        }
      });
      setAnalysis(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          setError('The request timed out. Please try again or use a smaller file.');
        } else if (error.response) {
          setError(`Error: ${error.response.data.detail || 'Unknown error'}`);
        } else if (error.request) {
          setError('No response received from server. Please check your connection and try again.');
        } else {
          setError(`Error: ${error.message}`);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      console.error('Error analysing file:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <h1>Australian Parliamentary Bill Analyser</h1>
      <form onSubmit={handleSubmit} className="upload-form">
        <input 
          type="file" 
          onChange={handleFileChange} 
          accept=".pdf" 
          className="file-input"
        />
        <button 
          type="submit" 
          disabled={!file || loading} 
          className={`submit-button ${(!file || loading) ? 'disabled' : ''}`}
        >
          {loading ? 'Analysing...' : 'Analyse Bill'}
        </button>
      </form>
      {loading && (
        <div className="progress-bar">
          <div className="progress-fill" style={{width: `${progress}%`}}>
            {progress}%
          </div>
        </div>
      )}
      {error && <p className="error">{error}</p>}
      {analysis && (
        <div className="results">
          <h2>Analysis Results</h2>
          <h3>Summary</h3>
          <p>{analysis.summary}</p>
          <h3>Key Points</h3>
          <ul>
            {analysis.key_points.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
          <h3>Arguments For</h3>
          <ul>
            {analysis.arguments_for.map((arg, index) => (
              <li key={index}>{arg}</li>
            ))}
          </ul>
          <h3>Arguments Against</h3>
          <ul>
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