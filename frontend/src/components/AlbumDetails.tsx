import { useEffect, useState } from 'react';

const API_URL = 'http://localhost:3000';

interface Album {
  id: string;
  title: string;
  itemCount: number;
  status: string;
  imageApi: string;
  textEnabled: boolean;
  cost: number | null;
  estimatedTime: number | null;
  actualTime: number | null;
  createdAt: string;
  completedAt: string | null;
  recipes: Recipe[];
}

interface Recipe {
  id: string;
  order: number;
  title: string;
  status: string;
  prepTime: string | null;
  cookTime: string | null;
  ingredients: string[] | null;
  steps: string[] | null;
  imageUrl: string | null;
  error: string | null;
}

interface Props {
  albumId: string;
}

export default function AlbumDetails({ albumId }: Props) {
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAlbum = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/albums/${albumId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await response.json();
        setAlbum(data);
      } catch (error) {
        console.error('Failed to fetch album:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlbum();

    // Poll every 3 seconds for status updates
    const interval = setInterval(() => {
      fetchAlbum();
    }, 3000);

    return () => clearInterval(interval);
  }, [albumId]);

  if (loading && !album) return <div>Loading...</div>;
  if (!album) return <div>Album not found</div>;

  const completedRecipes = album.recipes.filter(r => r.status === 'completed').length;
  const progress = Math.round((completedRecipes / album.itemCount) * 100);

  return (
    <div>
      <h3>{album.title}</h3>

      <div style={{ marginBottom: '20px' }}>
        <p><strong>Status:</strong> {album.status}</p>
        <p><strong>Items:</strong> {album.itemCount}</p>
        <p><strong>Image API:</strong> {album.imageApi}</p>
        <p><strong>Text Enabled:</strong> {album.textEnabled ? 'Yes' : 'No'}</p>
        {album.cost && <p><strong>Cost:</strong> ${album.cost.toFixed(2)}</p>}
        {album.estimatedTime && <p><strong>Estimated Time:</strong> ~{Math.ceil(album.estimatedTime / 60)} min</p>}
        {album.actualTime && <p><strong>Actual Time:</strong> {Math.ceil(album.actualTime / 60)} min</p>}
      </div>

      {album.status === 'processing' && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
            Progress: {completedRecipes} / {album.itemCount} ({progress}%)
          </div>
          <div style={{ 
            width: '100%', 
            height: '20px', 
            background: '#eee', 
            borderRadius: '4px',
            overflow: 'hidden' 
          }}>
            <div style={{ 
              width: `${progress}%`, 
              height: '100%', 
              background: '#4caf50',
              transition: 'width 0.3s'
            }}></div>
          </div>
        </div>
      )}

      <h4>Recipes ({album.recipes.length}):</h4>
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {album.recipes.map((recipe) => (
          <div
            key={recipe.id}
            style={{
              border: '1px solid #ddd',
              padding: '10px',
              marginBottom: '10px',
              background: recipe.status === 'completed' ? '#f0fff0' : '#fff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{recipe.order}. {recipe.title}</strong>
              <span style={{ 
                fontSize: '12px', 
                color: recipe.status === 'completed' ? 'green' : recipe.status === 'failed' ? 'red' : 'orange'
              }}>
                {recipe.status}
              </span>
            </div>

            {recipe.status === 'completed' && (
              <div style={{ marginTop: '10px', fontSize: '12px' }}>
                {recipe.prepTime && <div>⏱️ Prep: {recipe.prepTime}</div>}
                {recipe.cookTime && <div>🔥 Cook: {recipe.cookTime}</div>}
                {recipe.imageUrl && (
                  <div style={{ marginTop: '5px' }}>
                    <img
                      src={`${API_URL}${recipe.imageUrl}`}
                      alt={recipe.title}
                      style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                  </div>
                )}
              </div>
            )}

            {recipe.error && (
              <div style={{ color: 'red', fontSize: '12px', marginTop: '5px' }}>
                Error: {recipe.error}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
