import { useEffect, useState } from 'react';

const API_URL = 'http://localhost:3000';

interface Job {
  id: string;
  type: string;
  status: string;
  createdAt: string;
}

interface Props {
  refresh: number;
  onSelectJob: (id: string) => void;
  selectedJobId: string | null;
}

export default function JobList({ refresh, onSelectJob, selectedJobId }: Props) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/jobs`);
        
        if (!response.ok) {
          if (response.status === 401) {
            setError('Please login to see your jobs');
            setJobs([]);
            return;
          }
          throw new Error('Failed to fetch jobs');
        }
        
        const data = await response.json();
        
        if (Array.isArray(data)) {
          setJobs(data);
        } else {
          setJobs([]);
        }
      } catch (error) {
        console.error('Failed to fetch jobs:', error);
        setError('Failed to load jobs');
        setJobs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [refresh]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div>
      {!jobs || jobs.length === 0 ? (
        <p>No jobs</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #ccc' }}>
              <th style={{ textAlign: 'left', padding: '8px' }}>ID</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Type</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr 
                key={job.id}
                onClick={() => onSelectJob(job.id)}
                style={{ 
                  cursor: 'pointer',
                  backgroundColor: selectedJobId === job.id ? '#f0f0f0' : 'transparent'
                }}
              >
                <td style={{ padding: '8px' }}>{job.id.slice(0, 8)}...</td>
                <td style={{ padding: '8px' }}>{job.type}</td>
                <td style={{ padding: '8px' }}>{job.status}</td>
                <td style={{ padding: '8px' }}>{new Date(job.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
