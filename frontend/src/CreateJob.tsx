import { useState } from 'react';

const API_URL = 'http://localhost:3000';

interface Props {
  onCreated: () => void;
}

export default function CreateJob({ onCreated }: Props) {
  const [type, setType] = useState('content_generation');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      alert('Prompt required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          input: { prompt }
        })
      });

      if (!response.ok) throw new Error('Failed to create job');
      
      setPrompt('');
      onCreated();
      alert('Job created');
    } catch (error) {
      alert('Error: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '10px' }}>
        <label>Type: </label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="content_generation">Text</option>
          <option value="image_generation">Image</option>
        </select>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <label>Prompt: </label>
        <input 
          type="text" 
          value={prompt} 
          onChange={(e) => setPrompt(e.target.value)}
          style={{ width: '300px' }}
          disabled={loading}
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Job'}
      </button>
    </form>
  );
}
