import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc,
  updateDoc,
  arrayRemove,
  increment,
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Shield, 
  UserPlus, 
  Mail, 
  Users, 
  Crown, 
  AlertCircle, 
  Check, 
  X, 
  Eye,
  TrendingUp,
  Calendar,
  MapPin,
  ChevronDown,
  ChevronUp,
  Settings,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import TeamsList from './TeamsList';

function AdminPanel() {
  const { currentUser } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Admin invitations state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('team_admin'); // 'team_admin' or 'admin'
  const [inviteLoading, setInviteLoading] = useState(false);

  // Data state
  const [allTeams, setAllTeams] = useState([]);
  const [pendingAdminInvites, setPendingAdminInvites] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [appStats, setAppStats] = useState({
    totalUsers: 0,
    totalTeams: 0,
    totalMiles: 0,
    totalRides: 0
  });

  // UI state
  const [showUsersSection, setShowUsersSection] = useState(false);
  const [selectedTeamForManagement, setSelectedTeamForManagement] = useState(null);

  useEffect(() => {
    checkAdminAccess();
  }, [currentUser]);

  const checkAdminAccess = async () => {
    try {
      setLoading(true);
      
      // Get user profile
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists()) {
        setError('User profile not found');
        return;
      }
      
      const userData = userDoc.data();
      setUserProfile(userData);

      // Check if user is app admin
      if (userData.role !== 'admin') {
        setError('Access denied. App admin privileges required.');
        return;
      }

      // Load admin data
      await loadAdminData();

    } catch (error) {
      console.error('Error checking admin access:', error);
      setError('Failed to load admin panel');
    }
    
    setLoading(false);
  };

  const loadAdminData = async () => {
    try {
      // Load all teams
      const teamsQuery = query(collection(db, 'teams'));
      const teamsSnapshot = await getDocs(teamsQuery);
      const teams = [];
      teamsSnapshot.forEach((doc) => {
        teams.push({ id: doc.id, ...doc.data() });
      });
      setAllTeams(teams);

      // Load all users
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      const users = [];
      usersSnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });
      setAllUsers(users);

      // Load pending admin invitations (both team_admin and admin)
      const adminInvitesQuery = query(
        collection(db, 'invitations'),
        where('role', 'in', ['team_admin', 'admin']),
        where('used', '==', false)
      );
      const adminInvitesSnapshot = await getDocs(adminInvitesQuery);
      const adminInvites = [];
      adminInvitesSnapshot.forEach((doc) => {
        const data = doc.data();
        // Check if invitation hasn't expired
        const expiresAt = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
        const now = new Date();
        if (now < expiresAt) {
          adminInvites.push({ id: doc.id, ...data });
        }
      });
      setPendingAdminInvites(adminInvites);

      // Calculate app statistics
      const totalUsers = users.length;
      const totalTeams = teams.length;
      const totalMiles = users.reduce((sum, user) => sum + (user.totalMiles || 0), 0);
      const totalRides = teams.reduce((sum, team) => sum + (team.totalRides || 0), 0);

      setAppStats({
        totalUsers,
        totalTeams,
        totalMiles,
        totalRides
      });

    } catch (error) {
      console.error('Error loading admin data:', error);
      setError('Failed to load admin data');
    }
  };

  const handleInviteAdmin = async (e) => {
    e.preventDefault();
    setInviteLoading(true);
    setError('');
    setSuccess('');

    try {
      // Check if email is already invited
      const existingInvite = await getDoc(doc(db, 'invitations', inviteEmail));
      if (existingInvite.exists()) {
        setError('This email has already been invited');
        setInviteLoading(false);
        return;
      }

      // Check if user already exists
      const existingUserQuery = query(
        collection(db, 'users'),
        where('email', '==', inviteEmail)
      );
      const existingUserSnapshot = await getDocs(existingUserQuery);
      if (!existingUserSnapshot.empty) {
        setError('A user with this email already exists');
        setInviteLoading(false);
        return;
      }

      // Create invitation
      const invitationData = {
        email: inviteEmail,
        role: inviteRole,
        teamId: inviteRole === 'admin' ? null : null, // Admin doesn't need a team, team_admin will create one
        teamName: null,
        invitedBy: currentUser.uid,
        inviterUserName: userProfile.userName,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        used: false,
        usedAt: null,
        isTeamAdminInvite: inviteRole === 'team_admin',
        isAppAdminInvite: inviteRole === 'admin'
      };

      await setDoc(doc(db, 'invitations', inviteEmail), invitationData);

      // Create invitation link
      const linkParam = inviteRole === 'admin' ? 'appadmin=true' : 'admin=true';
      const inviteLink = `${window.location.origin}/register?email=${encodeURIComponent(inviteEmail)}&${linkParam}`;
      
      // Copy to clipboard
      try {
        await navigator.clipboard.writeText(inviteLink);
        const roleText = inviteRole === 'admin' ? 'App Admin' : 'Team Admin';
        setSuccess(`${roleText} invitation created! Link copied to clipboard. Share this link: ${inviteLink}`);
      } catch (clipboardError) {
        const roleText = inviteRole === 'admin' ? 'App Admin' : 'Team Admin';
        setSuccess(`${roleText} invitation created! Share this link: ${inviteLink}`);
      }

      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('team_admin');
      setTimeout(() => setSuccess(''), 5000);

      // Refresh data
      loadAdminData();

    } catch (error) {
      console.error('Error creating invitation:', error);
      setError('Failed to create invitation');
    }

    setInviteLoading(false);
  };

  const handleCancelAdminInvitation = async (email) => {
    try {
      await deleteDoc(doc(db, 'invitations', email));
      setSuccess('Admin invitation cancelled');
      setTimeout(() => setSuccess(''), 3000);
      loadAdminData();
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      setError('Failed to cancel invitation');
    }
  };

  const handleRemoveUserFromTeam = async (userId, userName, teamId) => {
    if (!confirm(`Are you sure you want to remove ${userName} from their team?`)) {
      return;
    }

    try {
      const userToRemove = allUsers.find(u => u.id === userId);
      const team = allTeams.find(t => t.id === teamId);
      
      if (!userToRemove || !team) {
        setError('User or team not found');
        return;
      }

      // Remove from team arrays
      await updateDoc(doc(db, 'teams', teamId), {
        memberIds: arrayRemove(userId),
        adminIds: arrayRemove(userId), // Remove from admins too if they were one
        memberCount: increment(-1),
        totalMiles: increment(-(userToRemove.totalMiles || 0)), // Subtract their miles
        lastUpdated: new Date().toISOString()
      });

      // Update user profile (remove team assignment)
      await updateDoc(doc(db, 'users', userId), {
        teamId: null,
        teamName: null,
        joinedTeamAt: null
      });

      setSuccess(`${userName} has been removed from ${team.name}`);
      setTimeout(() => setSuccess(''), 3000);

      // Refresh data
      loadAdminData();

    } catch (error) {
      console.error('Error removing user from team:', error);
      setError('Failed to remove user from team');
    }
  };

  const handleUpdateUserRole = async (userId, userName, currentRole, newRole) => {
    const roleText = newRole === 'admin' ? 'App Admin' : newRole === 'team_admin' ? 'Team Admin' : 'Team Member';
    if (!confirm(`Are you sure you want to make ${userName} a ${roleText}?`)) {
      return;
    }

    try {
      const user = allUsers.find(u => u.id === userId);
      
      // Update user role
      await updateDoc(doc(db, 'users', userId), {
        role: newRole
      });

      // Update team admin list if they're on a team
      if (user.teamId) {
        const team = allTeams.find(t => t.id === user.teamId);
        if (team) {
          if (newRole === 'team_admin') {
            // Add to admins
            const newAdminIds = [...(team.adminIds || [])];
            if (!newAdminIds.includes(userId)) {
              newAdminIds.push(userId);
              await updateDoc(doc(db, 'teams', user.teamId), {
                adminIds: newAdminIds,
                lastUpdated: new Date().toISOString()
              });
            }
          } else if (currentRole === 'team_admin') {
            // Remove from admins
            await updateDoc(doc(db, 'teams', user.teamId), {
              adminIds: arrayRemove(userId),
              lastUpdated: new Date().toISOString()
            });
          }
        }
      }

      setSuccess(`${userName} is now a ${roleText}`);
      setTimeout(() => setSuccess(''), 3000);

      // Refresh data
      loadAdminData();

    } catch (error) {
      console.error('Error updating user role:', error);
      setError('Failed to update user role');
    }
  };

  // If a team is selected for management, show the TeamsList component
  if (selectedTeamForManagement) {
    return (
      <div style={{
        background: '#033c59',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        maxWidth: '1200px',
        margin: '0 auto',
        border: '1px solid #005479'
      }}>
        {/* Back to Admin Panel Header */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid #005479'
        }}>
          <button
            onClick={() => setSelectedTeamForManagement(null)}
            style={{
              background: 'none',
              border: '1px solid #005479',
              color: '#ffc020',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#f5a302';
              e.target.style.color = '#f5a302';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#005479';
              e.target.style.color = '#ffc020';
            }}
          >
            <ArrowLeft size={16} />
            Back to Admin Panel
          </button>
          <div style={{ 
            fontSize: '18px', 
            color: '#ffc020', 
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Shield size={18} />
            App Admin managing: {selectedTeamForManagement.name}
          </div>
        </div>
        
        {/* Render TeamsList component with app admin context */}
        <TeamsList appAdminMode={true} selectedTeam={selectedTeamForManagement} />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        background: '#033c59',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        maxWidth: '1200px',
        margin: '0 auto',
        border: '1px solid #005479'
      }}>
        <h2 style={{ 
          fontSize: '28px', 
          fontWeight: '600', 
          color: '#ffc020', 
          margin: '0 0 16px 0',
          textAlign: 'center'
        }}>App Administration</h2>
        <p style={{ textAlign: 'center', color: '#b4bdc2', fontSize: '16px' }}>Loading admin panel...</p>
      </div>
    );
  }

  if (error && !userProfile) {
    return (
      <div style={{
        background: '#033c59',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        maxWidth: '1200px',
        margin: '0 auto',
        border: '1px solid #005479'
      }}>
        <h2 style={{ 
          fontSize: '28px', 
          fontWeight: '600', 
          color: '#ffc020', 
          margin: '0 0 16px 0',
          textAlign: 'center'
        }}>App Administration</h2>
        <div style={{
          background: '#0c1e34',
          color: '#ef4444',
          padding: '16px',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: '600',
          textAlign: 'center',
          border: '1px solid #005479'
        }}>
          <AlertCircle style={{ height: '16px', width: '16px', marginRight: '8px', display: 'inline' }} />
          {error}
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
      maxWidth: '1200px',
      margin: '0 auto',
      border: '1px solid #005479'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2 style={{ 
          fontSize: '28px', 
          fontWeight: '600', 
          color: '#ffc020', 
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Shield size={28} />
          App Administration
        </h2>
        <button
          onClick={() => setShowInviteModal(true)}
          style={{
            background: 'linear-gradient(135deg, #f5a302, #ffc020)',
            color: '#0c1e34',
            padding: '12px 20px',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <UserPlus size={16} />
          Create Invitation
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div style={{
          background: '#0c1e34',
          color: '#ffc020',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px',
          fontWeight: '600',
          border: '1px solid #005479',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Check size={16} style={{ marginRight: '8px' }} />
          {success}
        </div>
      )}

      {error && (
        <div style={{
          background: '#0c1e34',
          color: '#ef4444',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px',
          fontWeight: '600',
          border: '1px solid #005479',
          display: 'flex',
          alignItems: 'center'
        }}>
          <AlertCircle size={16} style={{ marginRight: '8px' }} />
          {error}
        </div>
      )}

      {/* App Statistics */}
      <div style={{
        background: '#0c1e34',
        padding: '24px',
        borderRadius: '12px',
        marginBottom: '32px',
        border: '1px solid #005479'
      }}>
        <h3 style={{ 
          margin: '0 0 20px 0', 
          fontSize: '20px', 
          color: '#ffc020', 
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <TrendingUp size={20} />
          App Statistics
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#ffc020' }}>
              {appStats.totalUsers}
            </div>
            <div style={{ fontSize: '14px', color: '#b4bdc2', fontWeight: '600' }}>Total Users</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#ffc020' }}>
              {appStats.totalTeams}
            </div>
            <div style={{ fontSize: '14px', color: '#b4bdc2', fontWeight: '600' }}>Active Teams</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#ffc020' }}>
              {appStats.totalMiles.toFixed(1)}
            </div>
            <div style={{ fontSize: '14px', color: '#b4bdc2', fontWeight: '600' }}>Total Miles</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#ffc020' }}>
              {appStats.totalRides}
            </div>
            <div style={{ fontSize: '14px', color: '#b4bdc2', fontWeight: '600' }}>Total Rides</div>
          </div>
        </div>
      </div>

      {/* Pending Admin Invitations */}
      {pendingAdminInvites.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ 
            margin: '0 0 16px 0', 
            fontSize: '20px', 
            color: '#ffc020', 
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Mail size={20} />
            Pending Admin Invitations ({pendingAdminInvites.length})
          </h3>
          
          <div style={{ display: 'grid', gap: '12px' }}>
            {pendingAdminInvites.map((invitation) => {
              const linkParam = invitation.role === 'admin' ? 'appadmin=true' : 'admin=true';
              const inviteLink = `${window.location.origin}/register?email=${encodeURIComponent(invitation.email)}&${linkParam}`;
              
              return (
                <div
                  key={invitation.id}
                  style={{
                    background: '#0c1e34',
                    border: '1px solid #005479',
                    borderRadius: '12px',
                    padding: '16px'
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
                        fontSize: '16px', 
                        fontWeight: '600', 
                        color: '#ffc020',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        {invitation.email}
                        {invitation.role === 'admin' && (
                          <Shield size={16} style={{ color: '#ef4444' }} />
                        )}
                        {invitation.role === 'team_admin' && (
                          <Crown size={16} style={{ color: '#f5a302' }} />
                        )}
                      </div>
                      <div style={{ fontSize: '14px', color: '#b4bdc2' }}>
                        Role: {invitation.role === 'admin' ? 'App Admin' : 'Team Admin'} • Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleCancelAdminInvitation(invitation.email)}
                      style={{
                        background: '#ef4444',
                        color: '#ffffff',
                        padding: '8px 12px',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <X size={14} />
                      Cancel
                    </button>
                  </div>

                  {/* Invitation Link Section */}
                  <div style={{
                    background: 'rgba(255, 192, 32, 0.1)',
                    border: '1px solid rgba(255, 192, 32, 0.2)',
                    borderRadius: '8px',
                    padding: '12px'
                  }}>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#ffc020', 
                      fontWeight: '600',
                      marginBottom: '8px'
                    }}>
                      📎 {invitation.role === 'admin' ? 'App Admin' : 'Team Admin'} Invitation Link:
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center'
                    }}>
                      <input
                        type="text"
                        value={inviteLink}
                        readOnly
                        style={{
                          flex: 1,
                          padding: '8px',
                          background: '#0c1e34',
                          border: '1px solid #005479',
                          borderRadius: '4px',
                          color: '#b4bdc2',
                          fontSize: '12px',
                          fontFamily: 'monospace'
                        }}
                        onClick={(e) => e.target.select()}
                      />
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(inviteLink);
                            setSuccess('Link copied to clipboard!');
                            setTimeout(() => setSuccess(''), 2000);
                          } catch (error) {
                            console.error('Failed to copy:', error);
                          }
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #f5a302, #ffc020)',
                          color: '#0c1e34',
                          padding: '8px 12px',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        📋 Copy
                      </button>
                    </div>
                    <div style={{ 
                      fontSize: '11px', 
                      color: '#b4bdc2',
                      marginTop: '4px',
                      fontStyle: 'italic'
                    }}>
                      {invitation.role === 'admin' 
                        ? 'Invitee will become an App Admin with full system access'
                        : 'Invitee will become a Team Admin and can create their own team'
                      }
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All Users Overview */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '20px', 
          color: '#ffc020', 
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Users size={20} />
          All Users ({allUsers.length})
        </h3>
        
        <div style={{ display: 'grid', gap: '12px' }}>
          {allUsers.map((user) => {
            const userTeam = allTeams.find(team => team.id === user.teamId);
            const isTeamAdmin = userTeam?.adminIds?.includes(user.id);
            
            return (
              <div
                key={user.id}
                style={{
                  background: '#0c1e34',
                  border: '1px solid #005479',
                  borderRadius: '12px',
                  padding: '16px'
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  marginBottom: '12px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: '16px', 
                      fontWeight: '600', 
                      color: '#ffc020',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px'
                    }}>
                      {user.userName}
                      {user.role === 'admin' && (
                        <Shield size={16} style={{ color: '#ef4444' }} />
                      )}
                      {isTeamAdmin && user.role !== 'admin' && (
                        <Crown size={16} style={{ color: '#f5a302' }} />
                      )}
                    </div>
                    <div style={{ fontSize: '14px', color: '#b4bdc2', marginBottom: '4px' }}>
                      {user.email}
                    </div>
                    <div style={{ fontSize: '12px', color: '#b4bdc2' }}>
                      Team: {user.teamName || 'No team'} • {user.totalMiles?.toFixed(1) || '0.0'} miles • Role: {
                        user.role === 'admin' ? 'App Admin' : 
                        user.role === 'team_admin' ? 'Team Admin' : 
                        'Team Member'
                      }
                    </div>
                    <div style={{ fontSize: '11px', color: '#b4bdc2', marginTop: '2px' }}>
                      Joined: {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {user.id !== currentUser.uid && (
                    <div style={{ display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'flex-end' }}>
                      {/* Role Management Buttons */}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => handleUpdateUserRole(
                              user.id, 
                              user.userName, 
                              user.role,
                              'admin'
                            )}
                            style={{
                              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                              color: '#ffffff',
                              padding: '4px 8px',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <Shield size={10} />
                            Make App Admin
                          </button>
                        )}
                        
                        {user.role === 'user' && (
                          <button
                            onClick={() => handleUpdateUserRole(
                              user.id, 
                              user.userName, 
                              user.role,
                              'team_admin'
                            )}
                            style={{
                              background: 'linear-gradient(135deg, #f5a302, #ffc020)',
                              color: '#0c1e34',
                              padding: '4px 8px',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <Crown size={10} />
                            Make Team Admin
                          </button>
                        )}
                        
                        {user.role === 'team_admin' && (
                          <button
                            onClick={() => handleUpdateUserRole(
                              user.id, 
                              user.userName, 
                              user.role,
                              'user'
                            )}
                            style={{
                              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                              color: '#ffffff',
                              padding: '4px 8px',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <Crown size={10} />
                            Remove Admin
                          </button>
                        )}
                      </div>
                      
                      {/* Remove from Team Button */}
                      {user.teamId && (
                        <button
                          onClick={() => handleRemoveUserFromTeam(user.id, user.userName, user.teamId)}
                          style={{
                            background: '#ef4444',
                            color: '#ffffff',
                            padding: '4px 8px',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <X size={10} />
                          Remove from Team
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '20px', 
          color: '#ffc020', 
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Users size={20} />
          All Teams ({allTeams.length})
        </h3>
        
        <div style={{ display: 'grid', gap: '12px' }}>
          {allTeams.map((team) => (
            <div
              key={team.id}
              style={{
                background: '#0c1e34',
                border: '1px solid #005479',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Team Image/Icon */}
                {team.teamImage ? (
                  <img
                    src={team.teamImage}
                    alt={`${team.name} logo`}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      border: '1px solid #005479'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #f5a302, #ffc020)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(245, 163, 2, 0.3)'
                  }}>
                    <Users size={24} color="#0c1e34" strokeWidth={2} />
                  </div>
                )}
                
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#ffc020' }}>
                    {team.name}
                  </div>
                  <div style={{ fontSize: '14px', color: '#b4bdc2' }}>
                    {team.memberCount} members • {team.totalMiles?.toFixed(1) || '0.0'} miles • {team.totalRides || 0} rides
                  </div>
                  <div style={{ fontSize: '12px', color: '#b4bdc2', marginTop: '2px' }}>
                    Created: {new Date(team.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Invitation Modal */}
      {showInviteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#033c59',
            borderRadius: '16px',
            padding: '32px',
            width: '100%',
            maxWidth: '500px',
            border: '1px solid #005479'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <UserPlus style={{ color: '#ffc020' }} size={24} />
              <h3 style={{ 
                margin: 0, 
                fontSize: '20px', 
                color: '#ffc020', 
                fontWeight: '600'
              }}>Create Admin Invitation</h3>
            </div>
            
            <form onSubmit={handleInviteAdmin}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: '#ffc020',
                  fontSize: '14px'
                }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email address"
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #005479',
                    borderRadius: '8px',
                    background: '#0c1e34',
                    color: '#b4bdc2',
                    fontSize: '16px',
                    fontWeight: '500',
                    boxSizing: 'border-box'
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
                  Role *
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #005479',
                    borderRadius: '8px',
                    background: '#0c1e34',
                    color: '#b4bdc2',
                    fontSize: '16px',
                    fontWeight: '500',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="team_admin">Team Admin</option>
                  <option value="admin">App Admin</option>
                </select>
              </div>

              {/* Role Explanation */}
              <div style={{
                background: 'rgba(255, 192, 32, 0.1)',
                border: '1px solid rgba(255, 192, 32, 0.2)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '14px', color: '#ffc020', fontWeight: '600', marginBottom: '4px' }}>
                  {inviteRole === 'admin' ? (
                    <>
                      <Shield size={16} style={{ display: 'inline', marginRight: '6px' }} />
                      App Admin Privileges:
                    </>
                  ) : (
                    <>
                      <Crown size={16} style={{ display: 'inline', marginRight: '6px' }} />
                      Team Admin Privileges:
                    </>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#b4bdc2', lineHeight: '1.4' }}>
                  {inviteRole === 'admin' ? (
                    <>
                      • Full system access and control<br/>
                      • Can create app admins and team admins<br/>
                      • Can view all teams and users<br/>
                      • Access to app administration panel
                    </>
                  ) : (
                    <>
                      • Can create and manage their own team<br/>
                      • Can invite and remove team members<br/>
                      • Can promote members to team admin<br/>
                      • Will receive a special registration link
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmail('');
                    setInviteRole('team_admin');
                  }}
                  style={{
                    background: '#005479',
                    color: '#b4bdc2',
                    padding: '12px 20px',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  style={{
                    background: inviteLoading ? '#005479' : 'linear-gradient(135deg, #f5a302, #ffc020)',
                    color: inviteLoading ? '#b4bdc2' : '#0c1e34',
                    padding: '12px 20px',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: inviteLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {inviteLoading ? 'Creating Invitation...' : `Create ${inviteRole === 'admin' ? 'App Admin' : 'Team Admin'} Invitation`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;