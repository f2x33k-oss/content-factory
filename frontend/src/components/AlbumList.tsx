import { useEffect, useState } from 'react';

const API_URL = 'http://localhost:3000';

interface Album {
  id: string;
  title: string;
  itemCount: number;
  status: string;
  cost: number | null;
  estimatedTime: number | null;
  actualTime: number | null;
  createdAt: string;
  completedAt: string | null;
  recipes?: Recipe[];
}

interface Recipe {
  id: string;
  status: string;
}

interface Props {
  refresh: number;
  onSelectAlbum: (id: string) => void;
  selectedAlbumId: string | null;
}

export default function AlbumList({ refresh, onSelectAlbum, selectedAlbumId }: Props) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAlbums = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/albums`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            setError('Please login');
            setAlbums([]);
            return;
          }
          throw new Error('Failed to fetch albums');
        }

        const data = await response.json();

        if (Array.isArray(data)) {
          setAlbums(data);
        } else {
          setAlbums([]);
        }
      } catch (error) {
        console.error('Failed to fetch albums:', error);
        setError('Failed to load albums');
        setAlbums([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAlbums();

    // Poll every 5 seconds if there are processing albums
    const interval = setInterval(() => {
      fetchAlbums();
    }, 5000);

    return () => clearInterval(interval);
  }, [refresh]);

  const handleDownloadText = async (albumId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/albums/${albumId}/download/text`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `album-${albumId}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Download failed: ' + (error as Error).message);
    }
  };

  const handleDownloadImages = async (albumId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/albums/${albumId}/download/images`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `album-${albumId}-images.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Download failed: ' + (error as Error).message);
    }
  };

  if (loading && albums.length === 0) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div>
      {!albums || albums.length === 0 ? (
        <p>No albums yet. Create your first recipe album above!</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc' }}>
              <th style={{ textAlign: 'left', padding: '8px' }}>Title</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Count</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Cost</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Time</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {albums.map((album) => {
              const statusColor =
                album.status === 'completed' ? '#4caf50' :
                album.status === 'processing' ? '#ff9800' :
                album.status === 'failed' ? '#f44336' : '#999';

              return (
                <tr
                  key={album.id}
                  onClick={() => onSelectAlbum(album.id)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: selectedAlbumId === album.id ? '#f0f0f0' : 'transparent',
                    borderBottom: '1px solid #eee',
                  }}
                >
                  <td style={{ padding: '8px' }}>{album.title}</td>
                  <td style={{ padding: '8px' }}>{album.itemCount}</td>
                  <td style={{ padding: '8px', color: statusColor, fontWeight: 'bold' }}>
                    {album.status}
                  </td>
                  <td style={{ padding: '8px' }}>
                    {album.cost ? `$${album.cost.toFixed(2)}` : '-'}
                  </td>
                  <td style={{ padding: '8px' }}>
                    {album.actualTime
                      ? `${Math.ceil(album.actualTime / 60)} min`
                      : album.estimatedTime
                      ? `~${Math.ceil(album.estimatedTime / 60)} min`
                      : '-'}
                  </td>
                  <td style={{ padding: '8px' }}>
                    {album.status === 'completed' && (
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                          onClick={(e) => handleDownloadText(album.id, e)}
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          📄 TXT
                        </button>
                        <button
                          onClick={(e) => handleDownloadImages(album.id, e)}
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          🖼️ ZIP
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
