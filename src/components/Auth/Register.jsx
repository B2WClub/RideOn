import { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bike, Mail, Lock, User, AlertCircle, Crown, Shield } from 'lucide-react';

const Register = () => {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    email: searchParams.get('email') || '', // Pre-fill from URL
    password: '',
    confirmPassword: '',
    userName: ''
  });
  const [invitationTeam, setInvitationTeam] = useState(searchParams.get('team') || ''); // Show team name from URL
  const [isTeamAdminInvite, setIsTeamAdminInvite] = useState(searchParams.get('admin') === 'true'); // Check if team admin invite
  const [isAppAdminInvite, setIsAppAdminInvite] = useState(searchParams.get('appadmin') === 'true'); // Check if app admin invite
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingUserName, setCheckingUserName] = useState(false);
  const [userNameAvailable, setUserNameAvailable] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));

    // Reset userName availability when user types
    if (e.target.name === 'userName') {
      setUserNameAvailable(null);
    }
  };

  const checkUserNameAvailability = async (userName) => {
    if (!userName || userName.length < 3) {
      setUserNameAvailable(null);
      return;
    }

    setCheckingUserName(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('userName', '==', userName)
      );
      const querySnapshot = await getDocs(q);
      setUserNameAvailable(querySnapshot.empty);
    } catch (error) {
      console.error('Error checking username:', error);
      setUserNameAvailable(null);
    }
    setCheckingUserName(false);
  };

  const handleUserNameBlur = () => {
    if (formData.userName.trim()) {
      checkUserNameAvailability(formData.userName.trim());
    }
  };

  // Check email invitation status
  const checkEmailInvitation = async (email) => {
    if (!email || !email.includes('@')) {
      return;
    }

    try {
      const inviteDoc = await getDoc(doc(db, 'invitations', email));
      if (!inviteDoc.exists()) {
        setError('This email has not been invited to join a team. Please contact a team administrator.');
        return false;
      }

      const inviteData = inviteDoc.data();
      
      // Check if invitation has expired
      const now = new Date();
      const expiresAt = inviteData.expiresAt.toDate ? 
        inviteData.expiresAt.toDate() : 
        new Date(inviteData.expiresAt);
      
      if (now > expiresAt) {
        setError('This invitation has expired. Please request a new invitation.');
        return false;
      }

      // Check if invitation has already been used
      if (inviteData.used) {
        setError('This invitation has already been used.');
        return false;
      }

      // Clear any previous errors if invitation is valid
      setError('');
      return true;
    } catch (error) {
      console.error('Error checking email invitation:', error);
      setError('Error validating invitation. Please try again.');
      return false;
    }
  };

  const handleEmailBlur = () => {
    if (formData.email.trim()) {
      checkEmailInvitation(formData.email.trim());
    }
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }

    if (!formData.userName.trim()) {
      setError('Username is required');
      return false;
    }

    if (formData.userName.length < 3) {
      setError('Username must be at least 3 characters');
      return false;
    }

    if (userNameAvailable === false) {
      setError('This username is already taken');
      return false;
    }

    if (!formData.password) {
      setError('Password is required');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      // Check if email has a valid team invitation
      const inviteDoc = await getDoc(doc(db, 'invitations', formData.email));
      if (!inviteDoc.exists()) {
        setError('This email has not been invited to join a team. Please contact a team administrator.');
        setLoading(false);
        return;
      }

      const inviteData = inviteDoc.data();
      
      // Check if invitation has expired
      const now = new Date();
      const expiresAt = inviteData.expiresAt.toDate ? 
        inviteData.expiresAt.toDate() : 
        new Date(inviteData.expiresAt);
      
      if (now > expiresAt) {
        setError('This invitation has expired. Please request a new invitation.');
        setLoading(false);
        return;
      }

      // Check if invitation has already been used
      if (inviteData.used) {
        setError('This invitation has already been used.');
        setLoading(false);
        return;
      }

      // Final username availability check
      await checkUserNameAvailability(formData.userName.trim());
      if (userNameAvailable === false) {
        setError('This username is already taken. Please choose another.');
        setLoading(false);
        return;
      }

      // Get team information (if not a team admin invite)
      let teamData = null;
      if (inviteData.teamId) {
        const teamDoc = await getDoc(doc(db, 'teams', inviteData.teamId));
        if (!teamDoc.exists()) {
          setError('The team for this invitation no longer exists. Please contact support.');
          setLoading(false);
          return;
        }
        teamData = teamDoc.data();
      }

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      
      const user = userCredential.user;

      // Handle app admin registration
      if (inviteData.isAppAdminInvite || inviteData.role === 'admin') {
        // Create initial team for the app admin (they need a team too)
        const newTeamData = {
          name: "System Administrators",
          description: "Application administrators team",
          adminIds: [user.uid],
          memberIds: [user.uid],
          memberCount: 1,
          totalMiles: 0,
          totalRides: 0,
          createdAt: new Date().toISOString(),
          createdBy: user.uid,
          isActive: true,
          weeklyMiles: 0,
          monthlyMiles: 0,
          lastUpdated: new Date().toISOString()
        };

        const teamRef = await addDoc(collection(db, 'teams'), newTeamData);

        // Create user profile as app admin
        await setDoc(doc(db, 'users', user.uid), {
          userId: user.uid,
          userName: formData.userName.trim(),
          email: formData.email,
          role: 'admin',
          teamId: teamRef.id,
          teamName: "System Administrators",
          createdAt: new Date().toISOString(),
          totalMiles: 0,
          joinedTeamAt: new Date().toISOString()
        });
      } else if (inviteData.isTeamAdminInvite || inviteData.role === 'team_admin') {
        // Create initial team for the team admin
        const newTeamData = {
          name: `${formData.userName}'s Team`,
          description: "A new cycling team",
          adminIds: [user.uid],
          memberIds: [user.uid],
          memberCount: 1,
          totalMiles: 0,
          totalRides: 0,
          createdAt: new Date().toISOString(),
          createdBy: user.uid,
          isActive: true,
          weeklyMiles: 0,
          monthlyMiles: 0,
          lastUpdated: new Date().toISOString()
        };

        const teamRef = await addDoc(collection(db, 'teams'), newTeamData);

        // Create user profile as team admin
        await setDoc(doc(db, 'users', user.uid), {
          userId: user.uid,
          userName: formData.userName.trim(),
          email: formData.email,
          role: 'team_admin',
          teamId: teamRef.id,
          teamName: `${formData.userName}'s Team`,
          createdAt: new Date().toISOString(),
          totalMiles: 0,
          joinedTeamAt: new Date().toISOString()
        });
      } else {
        // Regular team member registration
        if (!teamData) {
          setError('Team information not found. Please contact support.');
          setLoading(false);
          return;
        }

        // Create user profile document
        await setDoc(doc(db, 'users', user.uid), {
          userId: user.uid,
          userName: formData.userName.trim(),
          email: formData.email,
          role: inviteData.role || 'user',
          teamId: inviteData.teamId,
          teamName: teamData.name,
          createdAt: new Date().toISOString(),
          totalMiles: 0,
          joinedTeamAt: new Date().toISOString()
        });

        // Update team member list
        const updatedMemberIds = [...teamData.memberIds, user.uid];
        await updateDoc(doc(db, 'teams', inviteData.teamId), {
          memberIds: updatedMemberIds,
          memberCount: updatedMemberIds.length,
          lastUpdated: new Date().toISOString()
        });
      }

      // Mark invitation as used
      await updateDoc(doc(db, 'invitations', formData.email), {
        used: true,
        usedAt: new Date().toISOString()
      });

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      if (error.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger password (min 6 characters).');
      } else if (error.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (error.code === 'auth/operation-not-allowed') {
        setError('Email/password accounts are not enabled. Please contact support.');
      } else if (error.message.includes('invitation')) {
        setError(error.message); // Our custom invitation errors
      } else {
        setError(`Failed to create account: ${error.message}`);
      }
    }

    setLoading(false);
  };

  const inputStyle = {
    width: '100%',
    paddingLeft: '44px',
    paddingRight: '16px',
    paddingTop: '16px',
    paddingBottom: '16px',
    border: '2px solid #005479',
    borderRadius: '12px',
    background: '#0c1e34',
    color: '#b4bdc2',
    fontSize: '16px',
    fontWeight: '500',
    outline: 'none',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box'
  };

  const getUserNameInputStyle = () => {
    let borderColor = '#005479';
    if (checkingUserName) {
      borderColor = '#f5a302';
    } else if (userNameAvailable === true) {
      borderColor = '#22c55e'; // Green for available
    } else if (userNameAvailable === false) {
      borderColor = '#ef4444'; // Red for unavailable
    }

    return {
      ...inputStyle,
      borderColor: borderColor
    };
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0c1e34 0%, #033c59 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#033c59',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        padding: '40px',
        width: '100%',
        maxWidth: '450px',
        border: '1px solid #005479'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            marginBottom: '16px' 
          }}>
            <Bike style={{ 
              height: '48px', 
              width: '48px', 
              color: '#ffc020' 
            }} />
          </div>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: 'bold', 
            color: '#ffc020',
            margin: '0 0 8px 0'
          }}>Join RideOn</h1>
          
          {invitationTeam ? (
            <div>
              <p style={{ 
                color: '#ffc020', 
                margin: '0 0 4px 0', 
                fontSize: '16px',
                fontWeight: '600'
              }}>You've been invited to join:</p>
              <p style={{ 
                color: '#f5a302', 
                margin: '0 0 8px 0', 
                fontSize: '18px',
                fontWeight: '700'
              }}>{invitationTeam}</p>
              <p style={{ 
                color: '#b4bdc2', 
                margin: 0, 
                fontSize: '14px' 
              }}>Complete your registration to start tracking miles</p>
            </div>
          ) : isAppAdminInvite ? (
            <div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '8px'
              }}>
                <Shield style={{ color: '#ef4444' }} size={20} />
                <p style={{ 
                  color: '#ef4444', 
                  margin: 0, 
                  fontSize: '16px',
                  fontWeight: '600'
                }}>App Admin Invitation</p>
              </div>
              <p style={{ 
                color: '#b4bdc2', 
                margin: 0, 
                fontSize: '14px',
                textAlign: 'center'
              }}>You'll have full system administration access</p>
            </div>
          ) : isTeamAdminInvite ? (
            <div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '8px'
              }}>
                <Crown style={{ color: '#ffc020' }} size={20} />
                <p style={{ 
                  color: '#ffc020', 
                  margin: 0, 
                  fontSize: '16px',
                  fontWeight: '600'
                }}>Team Admin Invitation</p>
              </div>
              <p style={{ 
                color: '#b4bdc2', 
                margin: 0, 
                fontSize: '14px',
                textAlign: 'center'
              }}>You'll be able to create and manage your own team</p>
            </div>
          ) : (
            <p style={{ 
              color: '#b4bdc2', 
              margin: 0, 
              fontSize: '16px' 
            }}>Create your account with your team invitation</p>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
          {error && (
            <div style={{
              background: '#0c1e34',
              color: '#ffc020',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              border: '1px solid #005479'
            }}>
              <AlertCircle style={{ height: '16px', width: '16px', marginRight: '8px' }} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#ffc020',
              marginBottom: '8px'
            }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail style={{
                position: 'absolute',
                left: '12px',
                top: '16px',
                height: '20px',
                width: '20px',
                color: '#b4bdc2'
              }} />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleEmailBlur}
                placeholder="Enter your invited email"
                required
                style={inputStyle}
                onFocus={(e) => {
                  e.target.style.borderColor = '#f5a302';
                  e.target.style.boxShadow = '0 0 0 3px rgba(245, 163, 2, 0.1)';
                }}
              />
            </div>
            <p style={{ 
              fontSize: '12px', 
              color: '#b4bdc2', 
              margin: '4px 0 0 0',
              opacity: 0.8
            }}>
              Use the email address that received the team invitation
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#ffc020',
              marginBottom: '8px'
            }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <User style={{
                position: 'absolute',
                left: '12px',
                top: '16px',
                height: '20px',
                width: '20px',
                color: '#b4bdc2'
              }} />
              <input
                type="text"
                name="userName"
                value={formData.userName}
                onChange={handleChange}
                onBlur={handleUserNameBlur}
                placeholder="Choose a display name"
                required
                style={getUserNameInputStyle()}
                onFocus={(e) => {
                  if (!checkingUserName && userNameAvailable !== false) {
                    e.target.style.borderColor = '#f5a302';
                    e.target.style.boxShadow = '0 0 0 3px rgba(245, 163, 2, 0.1)';
                  }
                }}
              />
              {checkingUserName && (
                <div style={{
                  position: 'absolute',
                  right: '12px',
                  top: '18px',
                  fontSize: '12px',
                  color: '#f5a302'
                }}>
                  Checking...
                </div>
              )}
              {userNameAvailable === true && (
                <div style={{
                  position: 'absolute',
                  right: '12px',
                  top: '18px',
                  fontSize: '12px',
                  color: '#22c55e',
                  fontWeight: '600'
                }}>
                  ✓ Available
                </div>
              )}
              {userNameAvailable === false && (
                <div style={{
                  position: 'absolute',
                  right: '12px',
                  top: '18px',
                  fontSize: '12px',
                  color: '#ef4444',
                  fontWeight: '600'
                }}>
                  ✗ Taken
                </div>
              )}
            </div>
            <p style={{ 
              fontSize: '12px', 
              color: '#b4bdc2', 
              margin: '4px 0 0 0',
              opacity: 0.8
            }}>
              This will be shown on leaderboards and team lists
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#ffc020',
              marginBottom: '8px'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock style={{
                position: 'absolute',
                left: '12px',
                top: '16px',
                height: '20px',
                width: '20px',
                color: '#b4bdc2'
              }} />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a secure password"
                required
                style={inputStyle}
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
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#ffc020',
              marginBottom: '8px'
            }}>
              Confirm Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock style={{
                position: 'absolute',
                left: '12px',
                top: '16px',
                height: '20px',
                width: '20px',
                color: '#b4bdc2'
              }} />
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                required
                style={inputStyle}
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
          </div>

          <button
            type="submit"
            disabled={loading || checkingUserName || userNameAvailable === false}
            style={{
              width: '100%',
              background: (loading || checkingUserName || userNameAvailable === false)
                ? '#005479' 
                : 'linear-gradient(135deg, #f5a302, #ffc020)',
              color: (loading || checkingUserName || userNameAvailable === false) ? '#b4bdc2' : '#0c1e34',
              padding: '16px',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: (loading || checkingUserName || userNameAvailable === false) ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: (loading || checkingUserName || userNameAvailable === false)
                ? 'none' 
                : '0 4px 12px rgba(245, 163, 2, 0.3)',
              outline: 'none'
            }}
            onMouseEnter={(e) => {
              if (!loading && !checkingUserName && userNameAvailable !== false) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(245, 163, 2, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && !checkingUserName && userNameAvailable !== false) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(245, 163, 2, 0.3)';
              }
            }}
          >
            {loading ? 'Creating Account...' : 
             checkingUserName ? 'Checking Username...' :
             'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center' }}>
          <p style={{ 
            fontSize: '14px', 
            color: '#b4bdc2',
            margin: '0 0 8px 0'
          }}>
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffc020',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                padding: 0,
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.target.style.color = '#f5a302';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = '#ffc020';
              }}
            >
              Sign in
            </button>
          </p>
          <p style={{ 
            fontSize: '12px', 
            color: '#b4bdc2',
            margin: 0,
            opacity: 0.7
          }}>
            Need an invitation? Contact your team administrator
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;