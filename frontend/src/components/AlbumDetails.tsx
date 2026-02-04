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
      <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
        {album.recipes.map((recipe) => (
          <div
            key={recipe.id}
            style={{
              padding: '15px',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              marginBottom: '15px',
              backgroundColor: recipe.status === 'completed' ? '#f0fff0' : '#fff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 10px 0' }}>
                  {recipe.order}. {recipe.title}
                </h4>
                
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                  <span style={{ 
                    backgroundColor: recipe.status === 'completed' ? '#4caf50' : recipe.status === 'failed' ? '#f44336' : '#ff9800',
                    color: 'white',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    {recipe.status}
                  </span>
                </div>

                {recipe.status === 'completed' && (
                  <>
                    {recipe.prepTime && (
                      <div style={{ fontSize: '14px', marginBottom: '5px' }}>
                        ⏱️ Préparation : <strong>{recipe.prepTime}</strong>
                      </div>
                    )}
                    
                    {recipe.cookTime && (
                      <div style={{ fontSize: '14px', marginBottom: '15px' }}>
                        🔥 Cuisson : <strong>{recipe.cookTime}</strong>
                      </div>
                    )}

                    {recipe.ingredients && recipe.ingredients.length > 0 && (
                      <div style={{ marginBottom: '15px' }}>
                        <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>INGRÉDIENTS :</h5>
                        <ul style={{ margin: 0, paddingLeft: '20px' }}>
                          {recipe.ingredients.map((ing: string, idx: number) => (
                            <li key={idx} style={{ fontSize: '14px', marginBottom: '3px' }}>
                              {ing}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {recipe.steps && recipe.steps.length > 0 && (
                      <div style={{ marginBottom: '15px' }}>
                        <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>ÉTAPES :</h5>
                        <ol style={{ margin: 0, paddingLeft: '20px' }}>
                          {recipe.steps.map((step: string, idx: number) => (
                            <li key={idx} style={{ fontSize: '14px', marginBottom: '5px' }}>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </>
                )}

                {recipe.error && (
                  <div style={{ 
                    color: '#d32f2f', 
                    fontSize: '14px',
                    backgroundColor: '#ffebee',
                    padding: '8px',
                    borderRadius: '4px',
                    marginTop: '10px'
                  }}>
                    ❌ {recipe.error}
                  </div>
                )}
              </div>

              {recipe.imageUrl && recipe.status === 'completed' && (
                <div style={{ marginLeft: '20px' }}>
                  <img 
                    src={`${API_URL}${recipe.imageUrl}`}
                    alt={recipe.title}
                    style={{ 
                      width: '200px', 
                      height: '200px', 
                      objectFit: 'cover',
                      borderRadius: '8px',
                      border: '2px solid #e0e0e0'
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
