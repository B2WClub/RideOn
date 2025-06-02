import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

function MileHistory() {
  const { currentUser } = useAuth();
  const [mileLogs, setMileLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalMiles, setTotalMiles] = useState(0);

  useEffect(() => {
    const fetchMileLogs = async () => {
      try {
        console.log('Fetching mile logs for user:', currentUser.uid);
        
        const q = query(
          collection(db, 'mileLogs'),
          where('userId', '==', currentUser.uid)
        );
        
        const querySnapshot = await getDocs(q);
        console.log('Query results:', querySnapshot.size, 'documents found');
        
        const logs = [];
        let total = 0;
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          console.log('Found log:', doc.id, data);
          logs.push({ id: doc.id, ...data });
          total += data.miles;
        });
        
        // Sort logs by date (newest first)
        logs.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        console.log('Total logs:', logs.length, 'Total miles:', total);
        setMileLogs(logs);
        setTotalMiles(total);
      } catch (error) {
        console.error('Error fetching mile logs:', error);
        alert('Error loading rides: ' + error.message);
      }
      
      setLoading(false);
    };

    fetchMileLogs();
  }, [currentUser.uid]);

  if (loading) {
    return (
      <div style={{
        background: '#033c59',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        maxWidth: '900px',
        margin: '0 auto',
        border: '1px solid #005479'
      }}>
        <h2 style={{ 
          fontSize: '28px', 
          fontWeight: '600', 
          color: '#ffc020', 
          margin: '0 0 16px 0',
          textAlign: 'center'
        }}>Your Mile History</h2>
        <p style={{ textAlign: 'center', color: '#b4bdc2', fontSize: '16px' }}>Loading your rides...</p>
      </div>
    );
  }

  return (
    <div style={{
      background: '#033c59',
      borderRadius: '16px',
      padding: '40px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      maxWidth: '900px',
      margin: '0 auto',
      border: '1px solid #005479'
    }}>
      <h2 style={{ 
        fontSize: '28px', 
        fontWeight: '600', 
        color: '#ffc020', 
        margin: '0 0 32px 0',
        textAlign: 'center'
      }}>Your Mile History</h2>
      
      {/* Stats Summary */}
      <div style={{
        background: '#0c1e34',
        padding: '24px',
        borderRadius: '12px',
        marginBottom: '32px',
        textAlign: 'center',
        border: '1px solid #005479'
      }}>
        <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#ffc020' }}>
          {totalMiles.toFixed(1)} miles
        </div>
        <div style={{ color: '#b4bdc2', fontSize: '16px', fontWeight: '600', marginTop: '4px' }}>
          Total miles logged • {mileLogs.length} rides
        </div>
      </div>

      {/* Mile Logs List */}
      {mileLogs.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          color: '#b4bdc2', 
          padding: '40px',
          background: '#0c1e34',
          borderRadius: '12px',
          border: '1px solid #005479'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚴‍♂️</div>
          <p style={{ fontSize: '18px', fontWeight: '600', color: '#ffc020', margin: '0 0 8px 0' }}>
            No rides logged yet!
          </p>
          <p style={{ margin: 0, color: '#b4bdc2' }}>
            Start by logging your first bike ride.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {mileLogs.map((log) => (
            <div
              key={log.id}
              style={{
                background: '#0c1e34',
                border: '1px solid #005479',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
                e.target.style.borderColor = '#f5a302';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
                e.target.style.borderColor = '#005479';
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '12px'
              }}>
                <div>
                  <div style={{ 
                    fontSize: '24px', 
                    fontWeight: '700', 
                    color: '#ffc020',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    🚴‍♂️ {log.miles} miles
                  </div>
                  <div style={{ 
                    fontSize: '14px', 
                    color: '#b4bdc2',
                    fontWeight: '500',
                    marginTop: '4px'
                  }}>
                    {new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#b4bdc2',
                  background: 'rgba(180, 189, 194, 0.1)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontWeight: '500',
                  opacity: 0.7
                }}>
                  {log.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                </div>
              </div>
              
              {log.notes && (
                <div style={{
                  fontSize: '14px',
                  color: '#b4bdc2',
                  background: 'rgba(255, 192, 32, 0.1)',
                  padding: '12px',
                  borderRadius: '8px',
                  marginTop: '12px',
                  border: '1px solid rgba(255, 192, 32, 0.2)',
                  fontStyle: 'italic'
                }}>
                  "{log.notes}"
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MileHistory;