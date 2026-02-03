import { useState } from 'react';
import CreateJob from './CreateJob';
import JobList from './JobList';
import JobDetails from './JobDetails';

function App() {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Content Factory</h1>
      
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
        <div style={{ border: '1px solid #ccc', padding: '20px' }}>
          <h2>Job Details</h2>
          <JobDetails jobId={selectedJobId} />
        </div>
      )}
    </div>
  );
}

export default App;
