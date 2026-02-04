import { useState, useMemo } from 'react';

const API_URL = 'http://localhost:3000';

interface Props {
  onCreated: () => void;
}

export default function AlbumForm({ onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [imageApi, setImageApi] = useState('stability-ai');
  const [textEnabled, setTextEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  // Auto-detect item count from title
  const itemCount = useMemo(() => {
    const match = title.match(/(\d+)/);
    return match ? parseInt(match[0]) : 0;
  }, [title]);

  // Real-time cost/time estimation
  const estimation = useMemo(() => {
    if (itemCount === 0) return { cost: 0, time: 0 };

    const costPerText = 0.02;
    const costPerImage = 0.10;
    const timePerText = 10; // seconds
    const timePerImage = 20; // seconds

    let totalCost = 0;
    let totalTime = 0;

    if (textEnabled) {
      totalCost += itemCount * costPerText;
      totalTime += itemCount * timePerText;
    }

    totalCost += itemCount * costPerImage; // images always generated
    totalTime += itemCount * timePerImage;

    return {
      cost: totalCost.toFixed(2),
      time: Math.ceil(totalTime / 60), // minutes
    };
  }, [itemCount, textEnabled]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('Title required');
      return;
    }

    if (itemCount === 0) {
      alert('Please include a number in the title (e.g., "20 recettes")');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/albums`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          itemCount,
          imageApi,
          textEnabled,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create album');
      }

      setTitle('');
      onCreated();
      alert('Album creation started! Check the Albums list below.');
    } catch (error) {
      alert('Error: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '600px' }}>
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Title:
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: 20 recettes de gratins savoureux"
          style={{ width: '100%', padding: '8px' }}
          disabled={loading}
        />
        <small style={{ color: '#666' }}>
          Tip: Include a number in the title (e.g., "20 recettes...")
        </small>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Image API:
        </label>
        <select
          value={imageApi}
          onChange={(e) => setImageApi(e.target.value)}
          style={{ padding: '8px', width: '100%' }}
          disabled={loading}
        >
          <option value="stability-ai">Stability AI (SDXL)</option>
          <option value="midjourney">Midjourney (coming soon)</option>
          <option value="replicate">Replicate (coming soon)</option>
        </select>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={textEnabled}
            onChange={(e) => setTextEnabled(e.target.checked)}
            disabled={loading}
          />
          <span>Generate recipe text (ingredients + steps)</span>
        </label>
      </div>

      {itemCount > 0 && (
        <div
          style={{
            background: '#f0f8ff',
            border: '1px solid #b0d4ff',
            padding: '15px',
            borderRadius: '4px',
            marginBottom: '15px',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Estimation:</div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div>🍽️ <strong>{itemCount}</strong> recipes</div>
            <div>💰 <strong>${estimation.cost}</strong></div>
            <div>⏱️ <strong>~{estimation.time}</strong> min</div>
          </div>
        </div>
      )}

      <button type="submit" disabled={loading || itemCount === 0}>
        {loading ? 'Creating Album...' : 'Generate Album'}
      </button>
    </form>
  );
}
