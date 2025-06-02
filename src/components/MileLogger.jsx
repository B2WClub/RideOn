import { useState, useEffect } from 'react';
import { collection, addDoc, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
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

      // Add mile log to collection
      const docRef = await addDoc(collection(db, 'mileLogs'), {
        userId: currentUser.uid,
        userName: userProfile.userName,
        userEmail: currentUser.email,
        teamId: userProfile.teamId,
        teamName: userProfile.teamName,
        miles: milesFloat,
        date: date,
        location: '', // Optional field for future use
        notes: notes,
        createdAt: new Date()
      });

      // Update user's total miles
      await updateDoc(doc(db, 'users', currentUser.uid), {
        totalMiles: increment(milesFloat)
      });

      // Update team's total miles and rides
      if (userProfile.teamId) {
        await updateDoc(doc(db, 'teams', userProfile.teamId), {
          totalMiles: increment(milesFloat),
          totalRides: increment(1),
          lastUpdated: new Date().toISOString()
        });
      }

      console.log('Miles logged successfully!', docRef.id);

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
        maxWidth: '600px',
        margin: '0 auto',
        border: '1px solid #005479'
      }}>
        <h2 style={{ 
          fontSize: '28px', 
          fontWeight: '600', 
          color: '#ffc020', 
          margin: '0 0 24px 0',
          textAlign: 'center'
        }}>Log Your Miles</h2>
        <p style={{ textAlign: 'center', color: '#b4bdc2', fontSize: '16px' }}>Loading your profile...</p>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div style={{
        background: '#033c59',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        maxWidth: '600px',
        margin: '0 auto',
        border: '1px solid #005479'
      }}>
        <h2 style={{ 
          fontSize: '28px', 
          fontWeight: '600', 
          color: '#ffc020', 
          margin: '0 0 24px 0',
          textAlign: 'center'
        }}>Log Your Miles</h2>
        <div style={{
          background: '#0c1e34',
          color: '#ffc020',
          padding: '16px',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: '600',
          textAlign: 'center',
          border: '1px solid #005479'
        }}>
          Unable to load your profile. Please refresh the page or contact support.
        </div>
      </div>
      
    );
  }

  return (
    <div style={{
      background: '#033c59',
      borderRadius: '16px',
      padding: '40px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      maxWidth: '600px',
      margin: '0 auto',
      border: '1px solid #005479'
    }}>
      <h2 style={{ 
        fontSize: '28px', 
        fontWeight: '600', 
        color: '#ffc020', 
        margin: '0 0 8px 0',
        textAlign: 'center'
      }}>Log Your Miles</h2>
      
      {/* Team Info */}
      <div style={{
        background: '#0c1e34',
        padding: '16px',
        borderRadius: '12px',
        marginBottom: '24px',
        textAlign: 'center',
        border: '1px solid #005479'
      }}>
        <div style={{ 
          fontSize: '14px', 
          color: '#b4bdc2',
          marginBottom: '4px'
        }}>
          Logging for team:
        </div>
        <div style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          color: '#ffc020'
        }}>
          {userProfile.teamName}
        </div>
        <div style={{ 
          fontSize: '12px', 
          color: '#b4bdc2',
          marginTop: '4px'
        }}>
          as {userProfile.userName}
        </div>
      </div>
      
      {success && (
        <div style={{
          background: '#0c1e34',
          color: '#ffc020',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '24px',
          fontSize: '14px',
          fontWeight: '600',
          textAlign: 'center',
          border: '1px solid #005479',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
        }}>
          Miles logged successfully! 🚴‍♂️
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '600',
            color: '#ffc020',
            fontSize: '14px'
          }}>
            Miles Traveled *
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={miles}
            onChange={(e) => setMiles(e.target.value)}
            required
            placeholder="Enter miles (e.g., 5.2)"
            style={{
              width: '100%',
              padding: '16px',
              border: '2px solid #005479',
              borderRadius: '12px',
              fontSize: '16px',
              background: '#0c1e34',
              color: '#b4bdc2',
              transition: 'all 0.3s ease',
              fontWeight: '500',
              outline: 'none',
              height: '52px',
              boxSizing: 'border-box',
              appearance: 'textfield',
              WebkitAppearance: 'textfield',
              MozAppearance: 'textfield'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#f5a302';
              e.target.style.boxShadow = '0 0 0 3px rgba(245, 163, 2, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#005479';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '600',
            color: '#ffc020',
            fontSize: '14px'
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
              padding: '16px',
              border: '2px solid #005479',
              borderRadius: '12px',
              fontSize: '16px',
              background: '#0c1e34',
              color: '#b4bdc2',
              transition: 'all 0.3s ease',
              fontWeight: '500',
              outline: 'none'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#f5a302';
              e.target.style.boxShadow = '0 0 0 3px rgba(245, 163, 2, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#005479';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '600',
            color: '#ffc020',
            fontSize: '14px'
          }}>
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Where did you ride? How was the trip?"
            rows="4"
            style={{
              width: '100%',
              padding: '16px',
              border: '2px solid #005479',
              borderRadius: '12px',
              fontSize: '16px',
              resize: 'vertical',
              background: '#0c1e34',
              color: '#b4bdc2',
              transition: 'all 0.3s ease',
              fontWeight: '500',
              fontFamily: 'inherit',
              outline: 'none'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#f5a302';
              e.target.style.boxShadow = '0 0 0 3px rgba(245, 163, 2, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#005479';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            background: loading 
              ? '#005479' 
              : 'linear-gradient(135deg, #f5a302, #ffc020)',
            color: loading ? '#b4bdc2' : '#0c1e34',
            padding: '16px',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '700',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: loading 
              ? 'none' 
              : '0 4px 12px rgba(245, 163, 2, 0.3)',
            transform: loading ? 'none' : 'translateY(0)',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(245, 163, 2, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(245, 163, 2, 0.3)';
            }
          }}
        >
          {loading ? 'Logging Miles...' : 'Log Miles'}
        </button>
      </form>
    </div>
  );
}

export default MileLogger;