import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Trophy, Users, User, TrendingUp, Calendar, Hash, Medal, Activity, Bike } from 'lucide-react';

const DEV = import.meta.env.MODE === 'development';

function Leaderboard() {
  const [activeTab, setActiveTab] = useState('teams'); // 'teams' or 'individuals'
  const [sortBy, setSortBy] = useState('totalMiles'); // 'totalMiles', 'totalRides', 'weeklyMiles'
  const [teams, setTeams] = useState([]);
  const [individuals, setIndividuals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLeaderboardData();
  }, [sortBy]);

  const fetchLeaderboardData = async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch teams data
      let teamsQuery;
      if (sortBy === 'weeklyMiles') {
        // For weekly miles, we need to calculate from mileLogs
        // For now, use totalMiles as placeholder
        teamsQuery = query(
          collection(db, 'teams'),
          orderBy('totalMiles', 'desc'),
          limit(50)
        );
      } else {
        teamsQuery = query(
          collection(db, 'teams'),
          orderBy(sortBy, 'desc'),
          limit(50)
        );
      }
      
      const teamsSnapshot = await getDocs(teamsQuery);
      const teamsData = [];
      teamsSnapshot.forEach((doc) => {
        const data = doc.data();
        // Only include active teams with members
        if (data.memberCount > 0) {
          teamsData.push({
            id: doc.id,
            ...data,
            averageMilesPerMember: data.memberCount > 0 ? (data.totalMiles / data.memberCount).toFixed(1) : 0
          });
        }
      });
      setTeams(teamsData);

      // Fetch individuals data
      let usersQuery;
      if (sortBy === 'weeklyMiles') {
        // For weekly miles, we'll use totalMiles for now
        usersQuery = query(
          collection(db, 'users'),
          orderBy('totalMiles', 'desc'),
          limit(50)
        );
      } else if (sortBy === 'totalRides') {
        // Users don't have totalRides field, so we'll use totalMiles
        usersQuery = query(
          collection(db, 'users'),
          orderBy('totalMiles', 'desc'),
          limit(50)
        );
      } else {
        usersQuery = query(
          collection(db, 'users'),
          orderBy(sortBy, 'desc'),
          limit(50)
        );
      }

      const usersSnapshot = await getDocs(usersQuery);
      const usersData = [];
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        usersData.push({
          id: doc.id,
          ...data
        });
      });
      setIndividuals(usersData);

      if (DEV) {
        console.log('Leaderboard data fetched:', {
          teams: teamsData.length,
          individuals: usersData.length,
          sortBy
        });
      }

    } catch (error) {
      if (DEV) {
        console.error('Error fetching leaderboard data:', error);
      }
      setError('Failed to load leaderboard data');
    }

    setLoading(false);
  };

  const getMedalIcon = (position) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return null;
  };

  const getValueBySortType = (item) => {
    switch (sortBy) {
      case 'totalMiles':
        return item.totalMiles || 0;
      case 'totalRides':
        return item.totalRides || 0;
      case 'weeklyMiles':
        return item.weeklyMiles || item.totalMiles || 0; // Fallback to totalMiles
      default:
        return 0;
    }
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case 'totalMiles':
        return 'Total Miles';
      case 'totalRides':
        return 'Total Rides';
      case 'weeklyMiles':
        return 'Weekly Miles';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        color: '#ffc020',
        fontSize: '18px'
      }}>
        Loading leaderboard...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        color: '#ef4444',
        fontSize: '18px'
      }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{
      background: '#033c59',
      borderRadius: '16px',
      padding: '32px',
      maxWidth: '1200px',
      margin: '0 auto',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Trophy size={32} style={{ color: '#ffc020' }} />
          <h2 style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#ffc020',
            margin: 0
          }}>
            Leaderboard
          </h2>
        </div>

        {/* Sort Options */}
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setSortBy('totalMiles')}
            style={{
              padding: '8px 16px',
              background: sortBy === 'totalMiles' ? '#ffc020' : '#005479',
              color: sortBy === 'totalMiles' ? '#0c1e34' : '#b4bdc2',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Bike size={16} />
            Total Miles
          </button>
          <button
            onClick={() => setSortBy('totalRides')}
            style={{
              padding: '8px 16px',
              background: sortBy === 'totalRides' ? '#ffc020' : '#005479',
              color: sortBy === 'totalRides' ? '#0c1e34' : '#b4bdc2',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Hash size={16} />
            Total Rides
          </button>
          <button
            onClick={() => setSortBy('weeklyMiles')}
            style={{
              padding: '8px 16px',
              background: sortBy === 'weeklyMiles' ? '#ffc020' : '#005479',
              color: sortBy === 'weeklyMiles' ? '#0c1e34' : '#b4bdc2',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Calendar size={16} />
            Weekly Miles
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '24px',
        borderBottom: '2px solid #005479',
        paddingBottom: '0'
      }}>
        <button
          onClick={() => setActiveTab('teams')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            color: activeTab === 'teams' ? '#ffc020' : '#b4bdc2',
            border: 'none',
            borderBottom: activeTab === 'teams' ? '3px solid #ffc020' : '3px solid transparent',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '-2px'
          }}
        >
          <Users size={20} />
          Team Standings
        </button>
        <button
          onClick={() => setActiveTab('individuals')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            color: activeTab === 'individuals' ? '#ffc020' : '#b4bdc2',
            border: 'none',
            borderBottom: activeTab === 'individuals' ? '3px solid #ffc020' : '3px solid transparent',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '-2px'
          }}
        >
          <User size={20} />
          Individual Standings
        </button>
      </div>

      {/* Leaderboard Content */}
      <div style={{
        background: '#0c1e34',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        {activeTab === 'teams' ? (
          <div>
            {/* Team Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '60px 1fr 150px 120px 120px',
              padding: '16px 20px',
              background: '#005479',
              color: '#ffc020',
              fontSize: '14px',
              fontWeight: '600',
              borderBottom: '1px solid #033c59'
            }}>
              <div>Rank</div>
              <div>Team Name</div>
              <div style={{ textAlign: 'center' }}>{getSortLabel()}</div>
              <div style={{ textAlign: 'center' }}>Members</div>
              <div style={{ textAlign: 'center' }}>Avg/Member</div>
            </div>

            {/* Team Rows */}
            {teams.map((team, index) => (
              <div
                key={team.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 1fr 150px 120px 120px',
                  padding: '16px 20px',
                  borderBottom: '1px solid #005479',
                  color: '#b4bdc2',
                  transition: 'background 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#033c59';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: index < 3 ? '#ffc020' : '#b4bdc2'
                }}>
                  {getMedalIcon(index + 1) || `#${index + 1}`}
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#ffc020'
                }}>
                  {team.name}
                </div>
                <div style={{
                  textAlign: 'center',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#fff'
                }}>
                  {getValueBySortType(team).toLocaleString()}
                </div>
                <div style={{
                  textAlign: 'center',
                  fontSize: '16px'
                }}>
                  {team.memberCount}
                </div>
                <div style={{
                  textAlign: 'center',
                  fontSize: '16px'
                }}>
                  {team.averageMilesPerMember}
                </div>
              </div>
            ))}

            {teams.length === 0 && (
              <div style={{
                padding: '48px',
                textAlign: 'center',
                color: '#b4bdc2',
                fontSize: '16px'
              }}>
                No team data available
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Individual Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '60px 1fr 200px 150px',
              padding: '16px 20px',
              background: '#005479',
              color: '#ffc020',
              fontSize: '14px',
              fontWeight: '600',
              borderBottom: '1px solid #033c59'
            }}>
              <div>Rank</div>
              <div>Rider Name</div>
              <div>Team</div>
              <div style={{ textAlign: 'center' }}>{getSortLabel()}</div>
            </div>

            {/* Individual Rows */}
            {individuals.map((user, index) => (
              <div
                key={user.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 1fr 200px 150px',
                  padding: '16px 20px',
                  borderBottom: '1px solid #005479',
                  color: '#b4bdc2',
                  transition: 'background 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#033c59';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: index < 3 ? '#ffc020' : '#b4bdc2'
                }}>
                  {getMedalIcon(index + 1) || `#${index + 1}`}
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#ffc020'
                }}>
                  {user.userName}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#b4bdc2'
                }}>
                  {user.teamName || 'No Team'}
                </div>
                <div style={{
                  textAlign: 'center',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#fff'
                }}>
                  {getValueBySortType(user).toLocaleString()}
                </div>
              </div>
            ))}

            {individuals.length === 0 && (
              <div style={{
                padding: '48px',
                textAlign: 'center',
                color: '#b4bdc2',
                fontSize: '16px'
              }}>
                No individual data available
              </div>
            )}
          </div>
        )}
      </div>

      {/* Note about weekly miles */}
      {sortBy === 'weeklyMiles' && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: '#005479',
          borderRadius: '8px',
          color: '#ffc020',
          fontSize: '14px',
          textAlign: 'center'
        }}>
          Note: Weekly miles calculation is coming soon. Currently showing total miles.
        </div>
      )}
    </div>
  );
}

export default Leaderboard;