import { useState, useEffect } from 'react';
import CreateJob from './CreateJob';
import JobList from './JobList';
import JobDetails from './JobDetails';
import AlbumForm from './components/AlbumForm';
import AlbumList from './components/AlbumList';
import AlbumDetails from './components/AlbumDetails';

const API_URL = 'http://localhost:3000';

function App() {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [albumRefresh, setAlbumRefresh] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');
    
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        setAuthError(data.error || 'Login failed');
        return;
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      setIsAuthenticated(true);
      setEmail('');
      setPassword('');
    } catch (error) {
      setAuthError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');
    
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        const data = await response.json();
        setAuthError(data.error || 'Registration failed');
        return;
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      setIsAuthenticated(true);
      setEmail('');
      setPassword('');
      setName('');
    } catch (error) {
      setAuthError('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setSelectedJobId(null);
  };

  if (!isAuthenticated) {
    return (
      <div style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '400px' }}>
        <h1>Content Factory</h1>
        
        <div style={{ marginTop: '20px', border: '1px solid #ccc', padding: '20px' }}>
          <h2>{isLogin ? 'Login' : 'Register'}</h2>
          
          {authError && (
            <div style={{ background: '#fee', padding: '10px', marginBottom: '10px', color: 'red' }}>
              {authError}
            </div>
          )}
          
          <form onSubmit={isLogin ? handleLogin : handleRegister}>
            <div style={{ marginBottom: '10px' }}>
              <label>Email: </label><br />
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%' }}
                required
                disabled={loading}
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label>Password: </label><br />
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%' }}
                required
                disabled={loading}
              />
            </div>

            {!isLogin && (
              <div style={{ marginBottom: '10px' }}>
                <label>Name (optional): </label><br />
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%' }}
                  disabled={loading}
                />
              </div>
            )}

            <button type="submit" disabled={loading} style={{ marginRight: '10px' }}>
              {loading ? 'Loading...' : (isLogin ? 'Login' : 'Register')}
            </button>
            
            <button 
              type="button" 
              onClick={() => {
                setIsLogin(!isLogin);
                setAuthError('');
              }}
              disabled={loading}
              style={{ background: '#666' }}
            >
              {isLogin ? 'Need account?' : 'Have account?'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Content Factory</h1>
        <button onClick={handleLogout}>Logout</button>
      </div>
      
      <div style={{ marginBottom: '40px', border: '1px solid #ccc', padding: '20px' }}>
        <h2>Create Job</h2>
        <CreateJob onCreated={() => setRefresh(r => r + 1)} />
      </div>

      <div style={{ marginBottom: '40px', border: '1px solid #ccc', padding: '20px' }}>
        <h2>Jobs</h2>
        <JobList 
          refresh={refresh} 
          onSelectJob={setSelectedJobId}
          selectedJobId={selectedJobId}
        />
      </div>

      {selectedJobId && (
        <div style={{ marginBottom: '40px', border: '1px solid #ccc', padding: '20px' }}>
          <h2>Job Details</h2>
          <JobDetails jobId={selectedJobId} />
        </div>
      )}

      <div style={{ marginTop: '60px', borderTop: '3px solid #000', paddingTop: '40px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>📚 Recipe Albums</h2>
        
        <div style={{ marginBottom: '40px', border: '1px solid #ccc', padding: '20px', background: '#fafafa' }}>
          <h3>Create Album</h3>
          <AlbumForm onCreated={() => setAlbumRefresh(r => r + 1)} />
        </div>

        <div style={{ marginBottom: '40px', border: '1px solid #ccc', padding: '20px' }}>
          <h3>My Albums</h3>
          <AlbumList 
            refresh={albumRefresh}
            onSelectAlbum={setSelectedAlbumId}
            selectedAlbumId={selectedAlbumId}
          />
        </div>

        {selectedAlbumId && (
          <div style={{ border: '1px solid #ccc', padding: '20px' }}>
            <h3>Album Details</h3>
            <AlbumDetails albumId={selectedAlbumId} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
