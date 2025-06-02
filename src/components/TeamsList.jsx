import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc, 
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  arrayRemove,
  increment
} from 'firebase/firestore';
import { db } from '../firebase';
import { Users, Mail, UserPlus, Settings, Trash2, Crown, AlertCircle, Check, X, Upload, Camera, Bike, Shield } from 'lucide-react';

function TeamsList({ appAdminMode = false, selectedTeam = null }) {
  const { currentUser } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [team, setTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Edit team modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamDescription, setEditTeamDescription] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [teamImageFile, setTeamImageFile] = useState(null);
  const [teamImagePreview, setTeamImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Invite member modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    if (appAdminMode && selectedTeam) {
      fetchTeamDataForAdmin();
    } else {
      fetchTeamData();
    }
  }, [currentUser, appAdminMode, selectedTeam]);

  const fetchTeamDataForAdmin = async () => {
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
        setError('You do not have permission to manage teams');
        return;
      }

      // Use the selected team data
      setTeam(selectedTeam);
      setEditTeamName(selectedTeam.name);
      setEditTeamDescription(selectedTeam.description);
      setTeamImagePreview(selectedTeam.teamImage || null);

      // Get team members
      const membersQuery = query(
        collection(db, 'users'),
        where('teamId', '==', selectedTeam.id)
      );
      const membersSnapshot = await getDocs(membersQuery);
      const members = [];
      membersSnapshot.forEach((doc) => {
        members.push({ id: doc.id, ...doc.data() });
      });
      setTeamMembers(members);

      // Get pending invitations
      const invitationsQuery = query(
        collection(db, 'invitations'),
        where('teamId', '==', selectedTeam.id),
        where('used', '==', false)
      );
      const invitationsSnapshot = await getDocs(invitationsQuery);
      const invitations = [];
      invitationsSnapshot.forEach((doc) => {
        const data = doc.data();
        // Check if invitation hasn't expired
        const expiresAt = new Date(data.expiresAt);
        const now = new Date();
        if (now < expiresAt) {
          invitations.push({ id: doc.id, ...data });
        }
      });
      setPendingInvitations(invitations);

    } catch (error) {
      console.error('Error fetching team data for admin:', error);
      setError('Failed to load team data');
    }
    
    setLoading(false);
  };

  const fetchTeamData = async () => {
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

      // Check if user is team admin or app admin
      if (userData.role !== 'team_admin' && userData.role !== 'admin') {
        setError('You do not have permission to manage teams');
        return;
      }

      // Get team data
      const teamDoc = await getDoc(doc(db, 'teams', userData.teamId));
      if (!teamDoc.exists()) {
        setError('Team not found');
        return;
      }

      const teamData = teamDoc.data();
      setTeam({ id: userData.teamId, ...teamData });
      setEditTeamName(teamData.name);
      setEditTeamDescription(teamData.description);
      setTeamImagePreview(teamData.teamImage || null);

      // Get team members
      const membersQuery = query(
        collection(db, 'users'),
        where('teamId', '==', userData.teamId)
      );
      const membersSnapshot = await getDocs(membersQuery);
      const members = [];
      membersSnapshot.forEach((doc) => {
        members.push({ id: doc.id, ...doc.data() });
      });
      setTeamMembers(members);

      // Get pending invitations
      const invitationsQuery = query(
        collection(db, 'invitations'),
        where('teamId', '==', userData.teamId),
        where('used', '==', false)
      );
      const invitationsSnapshot = await getDocs(invitationsQuery);
      const invitations = [];
      invitationsSnapshot.forEach((doc) => {
        const data = doc.data();
        // Check if invitation hasn't expired
        const expiresAt = new Date(data.expiresAt);
        const now = new Date();
        if (now < expiresAt) {
          invitations.push({ id: doc.id, ...data });
        }
      });
      setPendingInvitations(invitations);

    } catch (error) {
      console.error('Error fetching team data:', error);
      setError('Failed to load team data');
    }
    
    setLoading(false);
  };

  const handleEditTeam = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setError('');
    setSuccess('');

    try {
      const updateData = {
        name: editTeamName,
        description: editTeamDescription,
        lastUpdated: new Date().toISOString()
      };

      // If there's a new image, convert to base64 and add to update
      if (teamImageFile) {
        setUploadingImage(true);
        const base64Image = await convertImageToBase64(teamImageFile);
        updateData.teamImage = base64Image;
        setUploadingImage(false);
      }

      await updateDoc(doc(db, 'teams', team.id), updateData);

      // Update team name in all member profiles
      const updatePromises = teamMembers.map(member =>
        updateDoc(doc(db, 'users', member.id), {
          teamName: editTeamName
        })
      );
      await Promise.all(updatePromises);

      setTeam(prev => ({
        ...prev,
        name: editTeamName,
        description: editTeamDescription,
        teamImage: updateData.teamImage || prev.teamImage
      }));

      setSuccess('Team updated successfully!');
      setShowEditModal(false);
      setTeamImageFile(null);
      setTimeout(() => setSuccess(''), 3000);

    } catch (error) {
      console.error('Error updating team:', error);
      setError('Failed to update team');
    }

    setEditLoading(false);
  };

  const handleInviteMember = async (e) => {
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

      const invitationData = {
        email: inviteEmail,
        role: inviteRole,
        teamId: team.id,
        teamName: team.name,
        invitedBy: currentUser.uid,
        inviterUserName: userProfile.userName,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        used: false,
        usedAt: null
      };

      await setDoc(doc(db, 'invitations', inviteEmail), invitationData);

      // Create invitation link
      const inviteLink = `${window.location.origin}/register?email=${encodeURIComponent(inviteEmail)}&team=${encodeURIComponent(team.name)}`;
      
      // Copy to clipboard
      try {
        await navigator.clipboard.writeText(inviteLink);
        setSuccess(`Invitation created! Link copied to clipboard. Share this link: ${inviteLink}`);
      } catch (clipboardError) {
        setSuccess(`Invitation created! Share this link: ${inviteLink}`);
      }
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('user');
      setTimeout(() => setSuccess(''), 3000);

      // Refresh invitations
      if (appAdminMode && selectedTeam) {
        fetchTeamDataForAdmin();
      } else {
        fetchTeamData();
      }

    } catch (error) {
      console.error('Error sending invitation:', error);
      setError('Failed to send invitation');
    }

    setInviteLoading(false);
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the team?`)) {
      return;
    }

    try {
      const memberToRemove = teamMembers.find(m => m.id === memberId);
      
      // Remove from team arrays
      await updateDoc(doc(db, 'teams', team.id), {
        memberIds: arrayRemove(memberId),
        adminIds: arrayRemove(memberId), // Remove from admins too if they were one
        memberCount: increment(-1),
        totalMiles: increment(-(memberToRemove.totalMiles || 0)), // Subtract their miles
        lastUpdated: new Date().toISOString()
      });

      // Update user profile (remove team assignment)
      await updateDoc(doc(db, 'users', memberId), {
        teamId: null,
        teamName: null,
        joinedTeamAt: null
      });

      setSuccess(`${memberName} has been removed from the team`);
      setTimeout(() => setSuccess(''), 3000);

      // Refresh team data
      if (appAdminMode && selectedTeam) {
        fetchTeamDataForAdmin();
      } else {
        fetchTeamData();
      }

    } catch (error) {
      console.error('Error removing member:', error);
      setError('Failed to remove member');
    }
  };

  const handleUpdateMemberRole = async (memberId, memberName, currentRole, newRole) => {
    const roleText = newRole === 'team_admin' ? 'Team Admin' : 'Team Member';
    if (!confirm(`Are you sure you want to make ${memberName} a ${roleText}?`)) {
      return;
    }

    try {
      // Update user role
      await updateDoc(doc(db, 'users', memberId), {
        role: newRole
      });

      // Update team admin list
      if (newRole === 'team_admin') {
        // Add to admins
        await updateDoc(doc(db, 'teams', team.id), {
          adminIds: [...(team.adminIds || []), memberId],
          lastUpdated: new Date().toISOString()
        });
      } else {
        // Remove from admins
        await updateDoc(doc(db, 'teams', team.id), {
          adminIds: arrayRemove(memberId),
          lastUpdated: new Date().toISOString()
        });
      }

      setSuccess(`${memberName} is now a ${roleText}`);
      setTimeout(() => setSuccess(''), 3000);

      // Refresh team data
      if (appAdminMode && selectedTeam) {
        fetchTeamDataForAdmin();
      } else {
        fetchTeamData();
      }

    } catch (error) {
      console.error('Error updating member role:', error);
      setError('Failed to update member role');
    }
  };

  const handleCancelInvitation = async (email) => {
    try {
      await deleteDoc(doc(db, 'invitations', email));
      setSuccess('Invitation cancelled');
      setTimeout(() => setSuccess(''), 3000);
      if (appAdminMode && selectedTeam) {
        fetchTeamDataForAdmin();
      } else {
        fetchTeamData();
      }
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      setError('Failed to cancel invitation');
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('Image must be smaller than 2MB');
        return;
      }
      
      setTeamImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setTeamImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Default team icon component
  const DefaultTeamIcon = ({ size = 48 }) => (
    <div style={{
      width: size,
      height: size,
      borderRadius: '12px',
      background: 'linear-gradient(135deg, #f5a302, #ffc020)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(245, 163, 2, 0.3)'
    }}>
      <Bike 
        size={size * 0.6} 
        color="#0c1e34"
        strokeWidth={2}
      />
    </div>
  );

  if (loading) {
    return (
      <div style={{
        background: '#033c59',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        maxWidth: '1000px',
        margin: '0 auto',
        border: '1px solid #005479'
      }}>
        <h2 style={{ 
          fontSize: '28px', 
          fontWeight: '600', 
          color: '#ffc020', 
          margin: '0 0 16px 0',
          textAlign: 'center'
        }}>Team Management</h2>
        <p style={{ textAlign: 'center', color: '#b4bdc2', fontSize: '16px' }}>Loading team data...</p>
      </div>
    );
  }

  if (error && !team) {
    return (
      <div style={{
        background: '#033c59',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        maxWidth: '1000px',
        margin: '0 auto',
        border: '1px solid #005479'
      }}>
        <h2 style={{ 
          fontSize: '28px', 
          fontWeight: '600', 
          color: '#ffc020', 
          margin: '0 0 16px 0',
          textAlign: 'center'
        }}>Team Management</h2>
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
      maxWidth: '1000px',
      margin: '0 auto',
      border: '1px solid #005479'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2 style={{ 
          fontSize: '28px', 
          fontWeight: '600', 
          color: '#ffc020', 
          margin: 0
        }}>
          {appAdminMode ? `Managing: ${team?.name}` : 'Team Management'}
        </h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          {appAdminMode && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#ef4444',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Shield size={14} />
              App Admin Mode
            </div>
          )}
          <button
            onClick={() => setShowEditModal(true)}
            style={{
              background: 'linear-gradient(135deg, #f5a302, #ffc020)',
              color: '#0c1e34',
              padding: '10px 16px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Settings size={16} />
            Edit Team
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            style={{
              background: 'linear-gradient(135deg, #f5a302, #ffc020)',
              color: '#0c1e34',
              padding: '10px 16px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <UserPlus size={16} />
            Invite Member
          </button>
        </div>
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

      {/* Team Overview */}
      <div style={{
        background: '#0c1e34',
        padding: '24px',
        borderRadius: '12px',
        marginBottom: '32px',
        border: '1px solid #005479'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px' }}>
          {/* Team Image/Icon */}
          {team.teamImage ? (
            <img
              src={team.teamImage}
              alt={`${team.name} logo`}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '12px',
                objectFit: 'cover',
                border: '2px solid #005479'
              }}
            />
          ) : (
            <DefaultTeamIcon size={64} />
          )}
          
          <div style={{ flex: 1 }}>
            <h3 style={{ 
              margin: '0 0 8px 0', 
              fontSize: '24px', 
              color: '#ffc020', 
              fontWeight: '600'
            }}>{team.name}</h3>
            <p style={{ 
              margin: '0', 
              fontSize: '16px', 
              color: '#b4bdc2'
            }}>{team.description}</p>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#ffc020' }}>
              {team.memberCount}
            </div>
            <div style={{ fontSize: '12px', color: '#b4bdc2', fontWeight: '600' }}>Members</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#ffc020' }}>
              {team.totalMiles?.toFixed(1) || '0.0'}
            </div>
            <div style={{ fontSize: '12px', color: '#b4bdc2', fontWeight: '600' }}>Total Miles</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#ffc020' }}>
              {team.totalRides || 0}
            </div>
            <div style={{ fontSize: '12px', color: '#b4bdc2', fontWeight: '600' }}>Total Rides</div>
          </div>
        </div>
      </div>

      {/* Team Members */}
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
          Team Members ({teamMembers.length})
        </h3>
        
        <div style={{ display: 'grid', gap: '12px' }}>
          {teamMembers.map((member) => {
            const isCurrentUser = member.id === currentUser.uid;
            const isTeamAdmin = team.adminIds?.includes(member.id);
            const canManageRole = !isCurrentUser; // Can't change your own role
            
            return (
              <div
                key={member.id}
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
                      {member.userName}
                      {isTeamAdmin && (
                        <Crown size={16} style={{ color: '#f5a302' }} />
                      )}
                      {isCurrentUser && (
                        <span style={{ 
                          fontSize: '12px', 
                          color: '#b4bdc2',
                          background: 'rgba(180, 189, 194, 0.1)',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          (You)
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '14px', color: '#b4bdc2', marginBottom: '4px' }}>
                      {member.email}
                    </div>
                    <div style={{ fontSize: '12px', color: '#b4bdc2' }}>
                      {member.totalMiles?.toFixed(1) || '0.0'} miles • {isTeamAdmin ? 'Team Admin' : 'Team Member'}
                    </div>
                  </div>
                  
                  {canManageRole && (
                    <div style={{ display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'flex-end' }}>
                      {/* Role Toggle Button */}
                      <button
                        onClick={() => handleUpdateMemberRole(
                          member.id, 
                          member.userName, 
                          member.role,
                          isTeamAdmin ? 'user' : 'team_admin'
                        )}
                        style={{
                          background: isTeamAdmin 
                            ? 'linear-gradient(135deg, #f5a302, #ffc020)' 
                            : 'linear-gradient(135deg, #22c55e, #16a34a)',
                          color: '#0c1e34',
                          padding: '6px 12px',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <Crown size={12} />
                        {isTeamAdmin ? 'Remove Admin' : 'Make Admin'}
                      </button>
                      
                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveMember(member.id, member.userName)}
                        style={{
                          background: '#ef4444',
                          color: '#ffffff',
                          padding: '6px 12px',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <Trash2 size={12} />
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div>
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
            Pending Invitations ({pendingInvitations.length})
          </h3>
          
          <div style={{ display: 'grid', gap: '12px' }}>
            {pendingInvitations.map((invitation) => {
              const inviteLink = `${window.location.origin}/register?email=${encodeURIComponent(invitation.email)}&team=${encodeURIComponent(team.name)}`;
              
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
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#ffc020' }}>
                        {invitation.email}
                      </div>
                      <div style={{ fontSize: '14px', color: '#b4bdc2' }}>
                        Role: {invitation.role} • Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleCancelInvitation(invitation.email)}
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
                      📎 Invitation Link - Share this with {invitation.email}:
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
                      Send this link via email, Slack, or text message
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {showEditModal && (
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
            <h3 style={{ 
              margin: '0 0 24px 0', 
              fontSize: '20px', 
              color: '#ffc020', 
              fontWeight: '600'
            }}>Edit Team</h3>
            
            <form onSubmit={handleEditTeam}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: '#ffc020',
                  fontSize: '14px'
                }}>
                  Team Image
                </label>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {/* Current/Preview Image */}
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '12px',
                    border: '2px solid #005479',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    background: '#0c1e34'
                  }}>
                    {teamImagePreview ? (
                      <img
                        src={teamImagePreview}
                        alt="Team preview"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <DefaultTeamIcon size={64} />
                    )}
                  </div>
                  
                  {/* Upload Controls */}
                  <div style={{ flex: 1 }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                      id="team-image-upload"
                    />
                    <label
                      htmlFor="team-image-upload"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'linear-gradient(135deg, #f5a302, #ffc020)',
                        color: '#0c1e34',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        border: 'none',
                        marginBottom: '8px'
                      }}
                    >
                      <Camera size={16} />
                      Choose Image
                    </label>
                    
                    {teamImageFile && (
                      <div style={{ fontSize: '12px', color: '#b4bdc2' }}>
                        Selected: {teamImageFile.name}
                      </div>
                    )}
                    
                    <div style={{ 
                      fontSize: '11px', 
                      color: '#b4bdc2',
                      marginTop: '4px'
                    }}>
                      Max 2MB • JPG, PNG, GIF supported
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: '#ffc020',
                  fontSize: '14px'
                }}>
                  Team Name *
                </label>
                <input
                  type="text"
                  value={editTeamName}
                  onChange={(e) => setEditTeamName(e.target.value)}
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
                  Description
                </label>
                <textarea
                  value={editTeamDescription}
                  onChange={(e) => setEditTeamDescription(e.target.value)}
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #005479',
                    borderRadius: '8px',
                    background: '#0c1e34',
                    color: '#b4bdc2',
                    fontSize: '16px',
                    fontWeight: '500',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setTeamImageFile(null);
                    setTeamImagePreview(team.teamImage || null);
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
                  disabled={editLoading || uploadingImage}
                  style={{
                    background: (editLoading || uploadingImage) ? '#005479' : 'linear-gradient(135deg, #f5a302, #ffc020)',
                    color: (editLoading || uploadingImage) ? '#b4bdc2' : '#0c1e34',
                    padding: '12px 20px',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: (editLoading || uploadingImage) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {uploadingImage ? (
                    <>
                      <Upload size={16} />
                      Uploading...
                    </>
                  ) : editLoading ? (
                    'Updating...'
                  ) : (
                    'Update Team'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
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
            <h3 style={{ 
              margin: '0 0 24px 0', 
              fontSize: '20px', 
              color: '#ffc020', 
              fontWeight: '600'
            }}>Invite New Member</h3>
            
            <form onSubmit={handleInviteMember}>
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
                  <option value="user">Team Member</option>
                  <option value="team_admin">Team Admin</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmail('');
                    setInviteRole('user');
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
                  {inviteLoading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamsList;