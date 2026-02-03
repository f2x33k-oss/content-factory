import { useEffect, useState } from 'react';

const API_URL = 'http://localhost:3000';

interface Job {
  id: string;
  type: string;
  status: string;
  input: any;
  output: any;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  jobId: string;
}

export default function JobDetails({ jobId }: Props) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/jobs/${jobId}`);
        const data = await response.json();
        setJob(data);
      } catch (error) {
        console.error('Failed to fetch job:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJob();

    // Poll every 3 seconds
    const interval = setInterval(() => {
      fetchJob();
    }, 3000);

    return () => clearInterval(interval);
  }, [jobId]);

  if (loading && !job) return <div>Loading...</div>;
  if (!job) return <div>Job not found</div>;

  return (
    <div>
      <p><strong>ID:</strong> {job.id}</p>
      <p><strong>Type:</strong> {job.type}</p>
      <p><strong>Status:</strong> {job.status}</p>
      <p><strong>Created:</strong> {new Date(job.createdAt).toLocaleString()}</p>
      <p><strong>Updated:</strong> {new Date(job.updatedAt).toLocaleString()}</p>
      
      <div style={{ marginTop: '20px' }}>
        <strong>Input:</strong>
        <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
          {JSON.stringify(job.input, null, 2)}
        </pre>
      </div>

      {job.output && (
        <div style={{ marginTop: '20px' }}>
          <strong>Output:</strong>
          <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
            {JSON.stringify(job.output, null, 2)}
          </pre>
        </div>
      )}

      {job.error && (
        <div style={{ marginTop: '20px' }}>
          <strong>Error:</strong>
          <pre style={{ background: '#fee', padding: '10px', color: 'red' }}>
            {job.error}
          </pre>
        </div>
      )}
    </div>
  );
}
