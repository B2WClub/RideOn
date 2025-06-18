import { useState, useEffect } from 'react';
import { collection, addDoc, doc, getDoc, updateDoc, increment, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

function MileLogger() {
  const { currentUser } = useAuth();
  const [miles, setMiles] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Fetch user profile data on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        } else if (import.meta.env.DEV) {
          console.error('User profile not found');
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error fetching user profile:', error);
        }
      }
      setProfileLoading(false);
    };

    if (currentUser) {
      fetchUserProfile();
    }
  }, [currentUser]);

  // Helper function to get current week identifier
  const getCurrentWeekId = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
    
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysFromMonday);
    weekStart.setHours(0, 0, 0, 0);
    
    // Format as YYYY-W## (e.g., "2025-W03")
    const year = weekStart.getFullYear();
    const weekNumber = Math.ceil((weekStart - new Date(year, 0, 1)) / (7 * 24 * 60 * 60 * 1000));
    return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!userProfile) {
      alert('Unable to log miles: User profile not loaded');
      return;
    }

    setLoading(true);
    setSuccess(false);

    try {
      const milesFloat = parseFloat(miles);
      const currentWeekId = getCurrentWeekId();

      const mileLogData = {
        userId: currentUser.uid,
        userName: userProfile.userName,
        userEmail: currentUser.email,
        teamId: userProfile.teamId,
        teamName: userProfile.teamName,
        miles: milesFloat,
        date: date,
        location: '', // Optional field for future use
        notes: notes,
        createdAt: serverTimestamp()
      };
      
      console.log('Attempting to log miles...', {
        userId: currentUser.uid,
        userName: userProfile.userName,
        userEmail: currentUser.email,
        teamId: userProfile.teamId,
        teamName: userProfile.teamName,
        miles: milesFloat,
        date: date,
        notes: notes
      });
      if (import.meta.env.DEV) {
            console.log('=== MILE LOGGING DEBUG ===');
            console.log('Attempting to create mile log with data:', mileLogData);
            console.log('Current user UID:', currentUser.uid);
            console.log('User profile:', userProfile);
            console.log('Current week ID:', currentWeekId);
      }

      let docRef;
        try {
          docRef = await addDoc(collection(db, 'mileLogs'), mileLogData);
          if (import.meta.env.DEV) {
            console.log('SUCCESS: Mile log created with ID:', docRef.id);
          }
        } catch (mileLogError) {
          if (import.meta.env.DEV) {
            console.error('Step 1 FAILED: Error creating mile log:', mileLogError);
            console.error('Error code:', mileLogError.code);
            console.error('Error message:', mileLogError.message);
          }
          throw mileLogError;
        }

        if (import.meta.env.DEV) {
          console.log('Attempting to update user total miles and rides...');
          console.log('User document path:', `users/${currentUser.uid}`);
          console.log('Incrementing miles by:', milesFloat);
          console.log('Incrementing rides by: 1');
        }

      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          totalMiles: increment(milesFloat),
          totalRides: increment(1) // NEW: Track user's total rides
        });
        if (import.meta.env.DEV) {
          console.log('SUCCESS: User total miles and rides updated');
        }
      } catch (userUpdateError) {
        if (import.meta.env.DEV) {
          console.error('FAILED: Error updating user stats:', userUpdateError);
          console.error('Error code:', userUpdateError.code);
        }
        // Don't throw - continue to try team update
      }

      // Update team's total miles and rides
      if (userProfile.teamId) {
        if (import.meta.env.DEV) {
          console.log('Attempting to update team stats...');
          console.log('Team document path:', `teams/${userProfile.teamId}`);
          console.log('Update data:', {
            totalMiles: `increment(${milesFloat})`,
            totalRides: 'increment(1)',
            lastUpdated: 'serverTimestamp()'
          });
        }

        try {
          await updateDoc(doc(db, 'teams', userProfile.teamId), {
            totalMiles: increment(milesFloat),
            totalRides: increment(1),
            lastUpdated: serverTimestamp()
          });
          if (import.meta.env.DEV) {
            console.log('SUCCESS: Team stats updated');
          }
        } catch (teamUpdateError) {
          if (import.meta.env.DEV) {
            console.error('FAILED: Error updating team stats:', teamUpdateError);
            console.error('Error code:', teamUpdateError.code);
            console.error('Team ID:', userProfile.teamId);
            console.error('User role:', userProfile.role);
          }
          // Don't throw - mile log was created successfully
        }
      } else {
        if (import.meta.env.DEV) {
          console.log('SKIPPED: User has no teamId');
        }
      }

      // NEW: Update weekly stats for user
      if (import.meta.env.DEV) {
        console.log('Attempting to update user weekly stats...');
        console.log('Weekly stats document path:', `weeklyStats/${currentUser.uid}-${currentWeekId}`);
      }

      try {
        await setDoc(doc(db, 'weeklyStats', `${currentUser.uid}-${currentWeekId}`), {
          userId: currentUser.uid,
          userName: userProfile.userName,
          teamId: userProfile.teamId,
          teamName: userProfile.teamName,
          weekId: currentWeekId,
          weeklyMiles: increment(milesFloat),
          weeklyRides: increment(1),
          lastUpdated: serverTimestamp()
        }, { merge: true });
        
        if (import.meta.env.DEV) {
          console.log('SUCCESS: User weekly stats updated');
        }
      } catch (weeklyStatsError) {
        if (import.meta.env.DEV) {
          console.error('FAILED: Error updating user weekly stats:', weeklyStatsError);
          console.error('Error code:', weeklyStatsError.code);
        }
        // Don't throw - this is supplementary data
      }

      // NEW: Update weekly stats for team
      if (userProfile.teamId) {
        if (import.meta.env.DEV) {
          console.log('Attempting to update team weekly stats...');
          console.log('Team weekly stats document path:', `weeklyTeamStats/${userProfile.teamId}-${currentWeekId}`);
        }

        try {
          await setDoc(doc(db, 'weeklyTeamStats', `${userProfile.teamId}-${currentWeekId}`), {
            teamId: userProfile.teamId,
            teamName: userProfile.teamName,
            weekId: currentWeekId,
            weeklyMiles: increment(milesFloat),
            weeklyRides: increment(1),
            memberCount: userProfile.memberCount || 1, // Will need to be updated when team membership changes
            lastUpdated: serverTimestamp()
          }, { merge: true });
          
          if (import.meta.env.DEV) {
            console.log('SUCCESS: Team weekly stats updated');
          }
        } catch (teamWeeklyStatsError) {
          if (import.meta.env.DEV) {
            console.error('FAILED: Error updating team weekly stats:', teamWeeklyStatsError);
            console.error('Error code:', teamWeeklyStatsError.code);
          }
          // Don't throw - this is supplementary data
        }
      }

      if (import.meta.env.DEV) {
        console.log('=== MILE LOGGING COMPLETE ===');
        console.log('Miles logged successfully with ID:', docRef.id);
      }

      // Reset form
      setMiles('');
      setNotes('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error logging miles:', error);
      alert('Error logging miles: ' + error.message);
    }

    setLoading(false);
  };

  if (profileLoading) {
    return (
      <div style={{
        background: '#033c59',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        maxWidth: '500px',
        margin: '0 auto',
        border: '1px solid #005479'
      }}>
        <h2 style={{ 
          fontSize: '28px', 
          fontWeight: '600', 
          color: '#ffc020', 
          margin: '0 0 16px 0',
          textAlign: 'center'
        }}>Log Your Miles</h2>
        <p style={{ textAlign: 'center', color: '#b4bdc2', fontSize: '16px' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{
      background: '#033c59',
      borderRadius: '16px',
      padding: '40px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      maxWidth: '500px',
      margin: '0 auto',
      border: '1px solid #005479'
    }}>
      <h2 style={{ 
        fontSize: '28px', 
        fontWeight: '600', 
        color: '#ffc020', 
        margin: '0 0 32px 0',
        textAlign: 'center'
      }}>Log Your Miles</h2>
      
      {/* Team Info */}
      {userProfile && (
        <div style={{
          background: '#0c1e34',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '24px',
          textAlign: 'center',
          border: '1px solid #005479'
        }}>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: '600', 
            color: '#ffc020',
            marginBottom: '4px'
          }}>
            Riding for {userProfile.teamName}
          </div>
          <div style={{ 
            fontSize: '14px', 
            color: '#b4bdc2'
          }}>
            Logged as {userProfile.userName}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '16px',
            fontWeight: '600',
            color: '#ffc020',
            marginBottom: '8px'
          }}>
            Miles *
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="1000"
            value={miles}
            onChange={(e) => setMiles(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '2px solid #005479',
              background: '#0c1e34',
              color: '#fff',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.3s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#ffc020';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#005479';
            }}
            placeholder="Enter miles (e.g., 5.2)"
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '16px',
            fontWeight: '600',
            color: '#ffc020',
            marginBottom: '8px'
          }}>
            Date *
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '2px solid #005479',
              background: '#0c1e34',
              color: '#fff',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.3s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#ffc020';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#005479';
            }}
          />
        </div>

        <div style={{ marginBottom: '32px' }}>
          <label style={{
            display: 'block',
            fontSize: '16px',
            fontWeight: '600',
            color: '#ffc020',
            marginBottom: '8px'
          }}>
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows="3"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '2px solid #005479',
              background: '#0c1e34',
              color: '#fff',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.3s ease',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#ffc020';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#005479';
            }}
            placeholder="Route details, weather, or other notes..."
          />
        </div>

        <button
          type="submit"
          disabled={loading || !miles}
          style={{
            width: '100%',
            padding: '14px',
            background: loading || !miles 
              ? '#005479' 
              : 'linear-gradient(135deg, #f5a302, #ffba41)',
            color: loading || !miles ? '#b4bdc2' : '#0c1e34',
            border: 'none',
            borderRadius: '12px',
            fontSize: '18px',
            fontWeight: '700',
            cursor: loading || !miles ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: loading || !miles 
              ? 'none' 
              : '0 4px 12px rgba(245, 163, 2, 0.3)',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            if (!loading && miles) {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(245, 163, 2, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading && miles) {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(245, 163, 2, 0.3)';
            }
          }}
        >
          {loading ? 'Logging Miles...' : 'Log Miles'}
        </button>

        {success && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: '#0a4f3c',
            border: '1px solid #16a085',
            borderRadius: '8px',
            color: '#16a085',
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            ✅ Miles logged successfully!
          </div>
        )}
      </form>
    </div>
  );
}

export default MileLogger;