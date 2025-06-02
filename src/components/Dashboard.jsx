import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import MileLogger from './MileLogger';
import MileHistory from './MileHistory';
import TeamsList from './TeamsList';
import AdminPanel from './AdminPanel';

function OverviewTab({ currentUser, userProfile }) {
  const [stats, setStats] = useState({ 
    totalMiles: 0, 
    totalRides: 0, 
    thisWeekMiles: 0, 
    thisWeekRides: 0 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const q = query(
          collection(db, 'mileLogs'),
          where('userId', '==', currentUser.uid)
        );
        
        const querySnapshot = await getDocs(q);
        let totalMiles = 0;
        let totalRides = 0;
        let thisWeekMiles = 0;
        let thisWeekRides = 0;
        
        // Get current week boundaries (Monday - Sunday)
        const now = new Date();
        const currentDay = now.getDay();
        const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
        
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - daysFromMonday);
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          totalMiles += data.miles;
          totalRides += 1;
          
          const rideDate = new Date(data.date + 'T00:00:00');
          if (rideDate >= weekStart && rideDate <= weekEnd) {
            thisWeekMiles += data.miles;
            thisWeekRides += 1;
          }
        });
        
        setStats({ 
          totalMiles, 
          totalRides, 
          thisWeekMiles, 
          thisWeekRides 
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
      setLoading(false);
    };

    fetchStats();
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
        }}>Your Cycling Overview</h2>
        <p style={{ textAlign: 'center', color: '#b4bdc2', fontSize: '16px' }}>Loading your stats...</p>
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
        fontSize: '32px', 
        fontWeight: '600', 
        color: '#ffc020', 
        margin: '0 0 40px 0',
        textAlign: 'center'
      }}>Your Cycling Overview</h2>
      
      {/* Team Info Banner */}
      {userProfile && (
        <div style={{
          background: '#0c1e34',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '32px',
          textAlign: 'center',
          border: '1px solid #005479'
        }}>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#ffc020',
            marginBottom: '4px'
          }}>
            {userProfile.teamName}
          </div>
          <div style={{ 
            fontSize: '14px', 
            color: '#b4bdc2'
          }}>
            You're riding as {userProfile.userName} • {userProfile.role === 'team_admin' ? 'Team Admin' : 'Team Member'}
          </div>
        </div>
      )}
      
      {/* Stats Cards - Dark theme like Welcome section */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: '20px', 
        marginBottom: '40px' 
      }}>
        {/* Row 1: Total Miles */}
        <div style={{
          background: '#0c1e34',
          padding: '24px',
          borderRadius: '12px',
          textAlign: 'center',
          border: '1px solid #005479',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          cursor: 'default'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'translateY(-3px)';
          e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
        }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#ffc020', marginBottom: '4px' }}>
            {stats.totalMiles.toFixed(1)}
          </div>
          <div style={{ fontSize: '14px', color: '#b4bdc2', fontWeight: '600' }}>Total Miles</div>
        </div>
        
        {/* Row 1: Total Rides */}
        <div style={{
          background: '#0c1e34',
          padding: '24px',
          borderRadius: '12px',
          textAlign: 'center',
          border: '1px solid #005479',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          cursor: 'default'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'translateY(-3px)';
          e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
        }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#ffc020', marginBottom: '4px' }}>
            {stats.totalRides}
          </div>
          <div style={{ fontSize: '14px', color: '#b4bdc2', fontWeight: '600' }}>Total Rides</div>
        </div>
        
        {/* Row 2: Miles This Week */}
        <div style={{
          background: '#0c1e34',
          padding: '24px',
          borderRadius: '12px',
          textAlign: 'center',
          border: '1px solid #005479',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          cursor: 'default'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'translateY(-3px)';
          e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
        }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#ffc020', marginBottom: '4px' }}>
            {stats.thisWeekMiles.toFixed(1)}
          </div>
          <div style={{ fontSize: '14px', color: '#b4bdc2', fontWeight: '600' }}>Miles This Week</div>
        </div>
        
        {/* Row 2: Rides This Week */}
        <div style={{
          background: '#0c1e34',
          padding: '24px',
          borderRadius: '12px',
          textAlign: 'center',
          border: '1px solid #005479',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          cursor: 'default'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'translateY(-3px)';
          e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
        }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#ffc020', marginBottom: '4px' }}>
            {stats.thisWeekRides}
          </div>
          <div style={{ fontSize: '14px', color: '#b4bdc2', fontWeight: '600' }}>Rides This Week</div>
        </div>
      </div>

      {/* Welcome Section - Dark theme */}
      <div style={{ 
        padding: '24px', 
        background: '#0c1e34', 
        borderRadius: '12px',
        border: '1px solid #005479'
      }}>
        <h3 style={{ 
          margin: '0 0 12px 0', 
          fontSize: '20px', 
          color: '#ffc020', 
          fontWeight: '600'
        }}>Welcome to RideOn!</h3>
        <p style={{ 
          margin: '0 0 16px 0', 
          fontSize: '16px', 
          color: '#ffc020',
          lineHeight: '1.5'
        }}>
          Track your bike commuting miles and join the Milwaukee cycling community.
        </p>
        <div style={{ fontSize: '15px', color: '#b4bdc2', lineHeight: '1.6' }}>
          <p style={{ margin: '6px 0', display: 'flex', alignItems: 'center' }}>
            <span style={{ 
              width: '6px', 
              height: '6px', 
              backgroundColor: '#b4bdc2', 
              borderRadius: '50%', 
              marginRight: '12px' 
            }}></span>
            View your progress in "My Rides"
          </p>
          <p style={{ margin: '6px 0', display: 'flex', alignItems: 'center' }}>
            <span style={{ 
              width: '6px', 
              height: '6px', 
              backgroundColor: '#b4bdc2', 
              borderRadius: '50%', 
              marginRight: '12px' 
            }}></span>
            Log today's commute in "Log Miles"
          </p>
          {userProfile?.role === 'team_admin' && (
            <p style={{ margin: '6px 0', display: 'flex', alignItems: 'center' }}>
              <span style={{ 
                width: '6px', 
                height: '6px', 
                backgroundColor: '#b4bdc2', 
                borderRadius: '50%', 
                marginRight: '12px' 
              }}></span>
              Manage your team in "Team Management"
            </p>
          )}
          <p style={{ margin: '6px 0', display: 'flex', alignItems: 'center' }}>
            <span style={{ 
              width: '6px', 
              height: '6px', 
              backgroundColor: '#b4bdc2', 
              borderRadius: '50%', 
              marginRight: '12px' 
            }}></span>
            Team competitions coming soon!
          </p>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Fetch user profile to determine available tabs
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
      setProfileLoading(false);
    };

    if (currentUser) {
      fetchUserProfile();
    }
  }, [currentUser]);

  const buttonStyle = (isActive) => ({
    background: isActive 
      ? 'linear-gradient(135deg, #f5a302, #ffba41)' 
      : '#033c59',
    color: isActive ? '#0c1e34' : '#b4bdc2',
    padding: '12px 24px',
    border: isActive ? 'none' : '2px solid #005479',
    borderRadius: '25px',
    marginRight: '12px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: isActive ? '600' : '500',
    transition: 'all 0.2s ease',
    boxShadow: isActive 
      ? '0 4px 12px rgba(245, 163, 2, 0.25)' 
      : '0 2px 4px rgba(0, 0, 0, 0.2)',
    outline: 'none'
  });

  // Show loading state while fetching user profile
  if (profileLoading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #0c1e34 0%, #033c59 100%)',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: '#b4bdc2', fontSize: '18px' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0c1e34 0%, #033c59 100%)',
      padding: '24px'
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Header - Dark theme */}
        <div style={{ 
          background: '#033c59', 
          padding: '24px 32px', 
          borderRadius: '16px', 
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          border: '1px solid #005479'
        }}>
          <div>
            <h1 style={{ 
              margin: '0 0 4px 0', 
              fontSize: '28px', 
              fontWeight: '600', 
              color: '#ffc020'
            }}>RideOn Dashboard</h1>
            <p style={{ 
              margin: 0, 
              color: '#b4bdc2', 
              fontSize: '15px' 
            }}>Welcome back, {userProfile?.userName || currentUser?.email}</p>
          </div>
          <button 
            onClick={logout} 
            style={{
              background: 'linear-gradient(135deg, #f5a302, #ffba41)',
              color: '#0c1e34',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              boxShadow: '0 2px 8px rgba(245, 163, 2, 0.3)',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 4px 12px rgba(245, 163, 2, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 2px 8px rgba(245, 163, 2, 0.3)';
            }}
          >
            Logout
          </button>
        </div>

        {/* Navigation - Dark theme tabs */}
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <button 
            onClick={() => setActiveTab('overview')} 
            style={buttonStyle(activeTab === 'overview')}
            onMouseEnter={(e) => {
              if (activeTab !== 'overview') {
                e.target.style.backgroundColor = '#005479';
                e.target.style.borderColor = '#f5a302';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'overview') {
                e.target.style.backgroundColor = '#033c59';
                e.target.style.borderColor = '#005479';
              }
            }}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('log')} 
            style={buttonStyle(activeTab === 'log')}
            onMouseEnter={(e) => {
              if (activeTab !== 'log') {
                e.target.style.backgroundColor = '#005479';
                e.target.style.borderColor = '#f5a302';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'log') {
                e.target.style.backgroundColor = '#033c59';
                e.target.style.borderColor = '#005479';
              }
            }}
          >
            Log Miles
          </button>
          <button 
            onClick={() => setActiveTab('history')} 
            style={buttonStyle(activeTab === 'history')}
            onMouseEnter={(e) => {
              if (activeTab !== 'history') {
                e.target.style.backgroundColor = '#005479';
                e.target.style.borderColor = '#f5a302';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'history') {
                e.target.style.backgroundColor = '#033c59';
                e.target.style.borderColor = '#005479';
              }
            }}
          >
            My Rides
          </button>
          
          {/* Show Team Management tab only for team admins */}
          {(userProfile?.role === 'team_admin' || userProfile?.role === 'admin') && (
            <button 
              onClick={() => setActiveTab('teams')} 
              style={buttonStyle(activeTab === 'teams')}
              onMouseEnter={(e) => {
                if (activeTab !== 'teams') {
                  e.target.style.backgroundColor = '#005479';
                  e.target.style.borderColor = '#f5a302';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'teams') {
                  e.target.style.backgroundColor = '#033c59';
                  e.target.style.borderColor = '#005479';
                }
              }}
            >
              Team Management
            </button>
          )}

          {/* Show Admin Panel tab only for app admins */}
          {userProfile?.role === 'admin' && (
            <button 
              onClick={() => setActiveTab('admin')} 
              style={buttonStyle(activeTab === 'admin')}
              onMouseEnter={(e) => {
                if (activeTab !== 'admin') {
                  e.target.style.backgroundColor = '#005479';
                  e.target.style.borderColor = '#f5a302';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'admin') {
                  e.target.style.backgroundColor = '#033c59';
                  e.target.style.borderColor = '#005479';
                }
              }}
            >
              App Administration
            </button>
          )}
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <OverviewTab currentUser={currentUser} userProfile={userProfile} />
        )}

        {activeTab === 'log' && <MileLogger />}
        {activeTab === 'history' && <MileHistory />}
        {activeTab === 'teams' && <TeamsList />}
        {activeTab === 'admin' && <AdminPanel />}
      </div>
    </div>
  );
}

export default Dashboard;