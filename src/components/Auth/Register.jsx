import { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, addDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bike, Mail, Lock, User, AlertCircle, Crown, Shield, Users2Icon, UsersIcon } from 'lucide-react';
import RideOnLogo from '../RideOnLogo';
import { v4 as uuidv4 } from 'uuid';

const Register = () => {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    email: searchParams.get('email') || '', // Pre-fill from URL
    password: '',
    confirmPassword: '',
    userName: '',
    teamName: ''
  });
  const [invitationTeam, setInvitationTeam] = useState(searchParams.get('team') || ''); 
  const [isTeamAdminInvite, setIsTeamAdminInvite] = useState(searchParams.get('admin') === 'true'); 
  const [isAppAdminInvite, setIsAppAdminInvite] = useState(searchParams.get('appadmin') === 'true'); 
  const [validatedInvitation, setValidatedInvitation] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingUserName, setCheckingUserName] = useState(false);
  const [userNameAvailable, setUserNameAvailable] = useState(null);
  const [userNameValidationError, setUserNameValidationError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check pre-populated email on component mount
    if (formData.email.trim()) {
      checkEmailInvitation(formData.email.trim());
    }
  }, []);

  // Username validation function
  const validateUsername = (userName) => {
    if (!userName) {
      return '';
    }

    if (userName.length < 3) {
      return 'Username must be at least 3 characters long';
    }

    if (userName.length > 20) {
      return 'Username must be 20 characters or less';
    }

    // Check for spaces
    if (userName.includes(' ')) {
      return 'Username cannot contain spaces';
    }

    // Check for valid characters only (letters, numbers, underscores, hyphens)
    const validUsernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!validUsernameRegex.test(userName)) {
      return 'Username can only contain letters, numbers, underscores, and hyphens';
    }

    // Check if starts or ends with special characters
    if (userName.startsWith('_') || userName.startsWith('-') || 
        userName.endsWith('_') || userName.endsWith('-')) {
      return 'Username cannot start or end with underscores or hyphens';
    }

    return '';
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Real-time username validation
    if (name === 'userName') {
      setUserNameAvailable(null);
      const validationError = validateUsername(value);
      setUserNameValidationError(validationError);
    }
  };

  // Updated username checking function using usernames collection
  const checkUserNameAvailability = async (userName) => {
    if (!userName || userName.length < 3) {
      setUserNameAvailable(null);
      return;
    }

    // First check if username is valid
    const validationError = validateUsername(userName);
    if (validationError) {
      setUserNameValidationError(validationError);
      setUserNameAvailable(null);
      return;
    }

    setCheckingUserName(true);
    try {
      if (import.meta.env.DEV) {
        console.log('Checking username availability for:', userName);
        console.log('Checking document path:', `usernames/${userName.toLowerCase()}`);
      }
      // Check if username document exists in usernames collection
      const usernameDoc = await getDoc(doc(db, 'usernames', userName.toLowerCase()));
      if (import.meta.env.DEV) {
        console.log('Username document exists:', usernameDoc.exists());
        console.log('Username available:', !usernameDoc.exists());
      }
      setUserNameAvailable(!usernameDoc.exists());
      if (usernameDoc.exists()) {
        if(import.meta.env.DEV) {
          console.log('Username taken by user:', usernameDoc.data()?.userId);
        }
      }
    } catch (error) {
        if(import.meta.env.DEV) {
          console.error('Error checking username:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
        }
      setUserNameAvailable(true);
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
      setValidatedInvitation(null);
      return;
    }
    try {
      // First check the public view
      const publicInviteDoc = await getDoc(doc(db, 'invitationsPublicView', email.toLowerCase()));
      if (!publicInviteDoc.exists()) {
        setError('This email has not been invited to join. Please contact an administrator.');
        setValidatedInvitation(null);
        return false;
    }
      const publicData = publicInviteDoc.data()
      // Check if invitation has expired
      const now = new Date();
      const expiresAt = publicData.expiresAt.toDate ? 
        publicData.expiresAt.toDate() : 
        new Date(publicData.expiresAt);
      
      if (now > expiresAt) {
        setError('This invitation has expired. Please request a new invitation.');
        setValidatedInvitation(null);
        return false;
      }
      // Check if invitation has already been used
      if (publicData.used) {
        setError('This invitation has already been used.');
        setValidatedInvitation(null);
        return false;
      }
      // Clear any previous errors if invitation is valid
      setError('');
      setValidatedInvitation(publicData)
      return true;
    } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error checking email invitation:', error);
        }
        setError('Error validating invitation. Please try again.');
        setValidatedInvitation(null);
      return false;
    }
  };

  const handleEmailBlur = () => {
    if (formData.email.trim()) {
      checkEmailInvitation(formData.email.trim());
    }
  };

  const validateForm = () => {
    if (!formData.email.trim()) return setError('Email is required') || false;
    if (!validatedInvitation) return setError('Please enter a valid invited email address') || false;
    if (!formData.userName.trim()) return setError('Username is required') || false;
    
    // Check username validation
    const usernameValidationError = validateUsername(formData.userName.trim());
    if (usernameValidationError) return setError(usernameValidationError) || false;
    
    if (userNameAvailable === false) return setError('Username taken') || false;
    if (!formData.password) return setError('Password required') || false;
    if (formData.password !== formData.confirmPassword) return setError('Passwords do not match') || false;
    if (formData.password.length < 6) return setError('Password too short') || false;
    if ((isTeamAdminInvite || isAppAdminInvite) && !formData.teamName.trim()) {
      return setError('Team name is required') || false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setError('');
    
    try {
      if (import.meta.env.DEV) console.debug('[Register] Start registration flow');
      
      if (!validatedInvitation) {
        throw new Error('Please validate your email invitation first.');
      }
      if (import.meta.env.DEV) console.debug('[Register] Invitation valid. Checking username availability...');

      const usernameDoc = await getDoc(doc(db, 'usernames', formData.userName.trim().toLowerCase()));
      if (usernameDoc.exists()) throw new Error('This username is already taken.');

      if (import.meta.env.DEV) console.debug('[Register] Username available. Creating auth account...');
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);

      const user = userCredential.user;
      if (import.meta.env.DEV) {
        console.debug('[Register] Firebase Auth account created for:', user.uid);
      }

      await new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((authUser) => {
          if (authUser && authUser.uid === user.uid) {
            unsubscribe();
            resolve();
          }
        });
      });
      await user.getIdToken(true);

      if (import.meta.env.DEV) {
        console.debug('[Register] Auth state ready, proceeding with Firestore operations');
        console.debug('[Register] User email:', user.email); 
        console.debug('[Register] User object:', user); 
      }

      const token = await user.getIdTokenResult();
      if (import.meta.env.DEV) {
        console.debug('[Register] Token email:', token.claims.email);
        console.debug('[Register] Token email_verified:', token.claims.email_verified);
        console.debug('[Register] Invitation lookup email:', formData.email.toLowerCase());
      }

      if (import.meta.env.DEV) console.debug('[Register] Fetching invitation...');
      const inviteDoc = await getDoc(doc(db, 'invitations', formData.email.toLowerCase()));
      if (import.meta.env.DEV) console.debug('[Register] Retrieved invitation:', inviteDoc.exists() ? 'exists' : 'not found');
      if (!inviteDoc.exists()) throw new Error('This email has not been invited.');

      const inviteData = inviteDoc.data();
      const now = new Date();
      const expiresAt = inviteData.expiresAt.toDate ? 
        inviteData.expiresAt.toDate() : 
        new Date(inviteData.expiresAt);
      
      if (now > expiresAt) throw new Error('This invitation has expired.');
      if (inviteData.used) throw new Error('This invitation has already been used.');

      // Variables we'll need for document creation
      let userData, teamRef, teamData;

      if (inviteData.isAppAdminInvite || inviteData.role === 'admin') {
        // Create initial team for the app admin
        if (import.meta.env.DEV) console.debug('[Register] Creating team for app admin...');
        
        teamData = {
          name: formData.teamName.trim(),
          description: "Application administrators team",
          adminIds: [user.uid],
          memberIds: [user.uid],
          memberCount: 1,
          totalMiles: 0,
          totalRides: 0,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
          isActive: true,
          weeklyMiles: 0,
          monthlyMiles: 0,
          lastUpdated: serverTimestamp()
        };

        const newTeamId = uuidv4();
        teamRef = doc(db, 'teams', newTeamId);

        userData = {
          userId: user.uid,
          userName: formData.userName.trim(),
          email: user.email,
          role: 'admin',
          teamId: teamRef.id,
          teamName: formData.teamName.trim(),
          createdAt: serverTimestamp(),
          totalMiles: 0,
          joinedTeamAt: serverTimestamp()
        };

      } else if (inviteData.isTeamAdminInvite || inviteData.role === 'team_admin') {
        if (import.meta.env.DEV) console.debug('[Register] Creating team for team admin...');
        
        teamData = {
          name: formData.teamName.trim(),
          description: "A new cycling team",
          adminIds: [user.uid],
          memberIds: [user.uid],
          memberCount: 1,
          totalMiles: 0,
          totalRides: 0,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
          isActive: true,
          weeklyMiles: 0,
          monthlyMiles: 0,
          lastUpdated: serverTimestamp()
        };

        const newTeamId = uuidv4();
        teamRef = doc(db, 'teams', newTeamId);

        userData = {
          userId: user.uid,
          userName: formData.userName.trim(),
          email: user.email,
          role: 'team_admin',
          teamId: teamRef.id,
          teamName: formData.teamName.trim(),
          createdAt: serverTimestamp(),
          totalMiles: 0,
          joinedTeamAt: serverTimestamp()
        };
      } else {
        // Regular team member registration
        if (import.meta.env.DEV) console.debug('[Register] Registering as regular team member...');
        const existingTeamDoc = await getDoc(doc(db, 'teams', inviteData.teamId));
        if (!existingTeamDoc.exists()) {
          setError('The team for this invitation no longer exists. Please contact support.');
          setLoading(false);
          return;
        }
        
        const existingTeamData = existingTeamDoc.data();

        userData = {
          userId: user.uid,
          userName: formData.userName.trim(),
          email: user.email,
          role: inviteData.role || 'user',
          teamId: inviteData.teamId,
          teamName: existingTeamData.name,
          createdAt: serverTimestamp(),
          totalMiles: 0,
          joinedTeamAt: serverTimestamp()
        };
      }

      // Now create all documents using individual operations
      if (import.meta.env.DEV) console.debug('[Register] Creating user, username, and team documents...');

      try {
        // Create team first if needed (for admin/team_admin roles)
        if (teamRef && teamData) {
          if (import.meta.env.DEV) {
            console.debug('[Register] Attempting to create team with ID:', teamRef.id);
            console.debug('[Register] Team data:', teamData);
            console.debug('[Register] Current user ID:', user.uid);
          }
          await setDoc(teamRef, teamData);
          if (import.meta.env.DEV) console.debug('[Register] Team created successfully');
        }

        // Create user document
        const userRef = doc(db, 'users', user.uid);
        if (import.meta.env.DEV) {
          console.debug('[Register] Attempting to create user document');
          console.debug('[Register] User data:', userData);
        }
        await setDoc(userRef, userData);
        if (import.meta.env.DEV) console.debug('[Register] User document created successfully');

        // Create username document
        const usernameRef = doc(db, 'usernames', formData.userName.trim().toLowerCase());
        await setDoc(usernameRef, { userId: user.uid, createdAt: serverTimestamp() });
        if (import.meta.env.DEV) console.debug('[Register] Username document created successfully');

        // Update invitation as used
        const inviteRef = doc(db, 'invitations', formData.email.toLowerCase());
        await updateDoc(inviteRef, {
          used: true,
          usedAt: serverTimestamp()
        });
        if (import.meta.env.DEV) console.debug('[Register] Invitation marked as used');

        // Update team if joining existing team (regular user)
        if (!teamRef && inviteData.teamId) {
          const existingTeamDoc = await getDoc(doc(db, 'teams', inviteData.teamId));
          if (existingTeamDoc.exists()) {
            const existingTeamData = existingTeamDoc.data();
            const updatedMemberIds = [...existingTeamData.memberIds, user.uid];
            
            await updateDoc(doc(db, 'teams', inviteData.teamId), {
              memberIds: updatedMemberIds,
              memberCount: updatedMemberIds.length,
              lastUpdated: serverTimestamp()
            });
            if (import.meta.env.DEV) console.debug('[Register] Team membership updated');
          }
        }

      } catch (error) {
        // Clean up if something fails
        if (import.meta.env.DEV) console.error('[Register] Error during document creation:', error);
        
        // Try to clean up created documents
        try {
          if (teamRef) await deleteDoc(teamRef);
          await deleteDoc(doc(db, 'users', user.uid));
          await deleteDoc(doc(db, 'usernames', formData.userName.trim().toLowerCase()));
        } catch (cleanupError) {
          if (import.meta.env.DEV) console.warn('[Register] Cleanup error:', cleanupError);
        }
        
        throw error;
      }

      // Clean up public invitation
      try {
        await deleteDoc(doc(db, 'invitationsPublicView', formData.email.toLowerCase()));
        if (import.meta.env.DEV) console.debug('[Register] Public invitation cleaned up');
      } catch (cleanupError) {
        // Log but don't fail registration
        if (import.meta.env.DEV) {
          console.warn('[Register] Failed to cleanup public invitation:', cleanupError);
        }
      }

      if (import.meta.env.DEV) {
        console.log('User profile and username created successfully!');
      }

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Registration error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
      }
      
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
    if (userNameValidationError) {
      borderColor = '#ef4444'; // Red for validation error
    } else if (checkingUserName) {
      borderColor = '#f5a302'; // Orange for checking
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
          <RideOnLogo size={48} style={{ marginBottom: '16px' }} />
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
          
          {(isAppAdminInvite || isTeamAdminInvite) && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#ffc020',
              marginBottom: '8px'
            }}>
              Team Name
            </label>
            <div style={{ position: 'relative' }}>
              <UsersIcon style={{
                position: 'absolute',
                left: '12px',
                top: '16px',
                height: '20px',
                width: '20px',
                color: '#b4bdc2'
              }} />
              <input
                type="text"
                name="teamName"
                value={formData.teamName}
                onChange={handleChange}
                placeholder="Name your team"
                required
                style={{
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
                }}
              />
            </div>
            <p style={{ 
              fontSize: '12px', 
              color: '#b4bdc2', 
              margin: '4px 0 0 0',
              opacity: 0.8
            }}>
              Your team name will be visible in rankings and dashboards.
            </p>
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
                  if (!checkingUserName && userNameAvailable !== false && !userNameValidationError) {
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
              {!userNameValidationError && userNameAvailable === true && (
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
              {(userNameValidationError || userNameAvailable === false) && (
                <div style={{
                  position: 'absolute',
                  right: '12px',
                  top: '18px',
                  fontSize: '12px',
                  color: '#ef4444',
                  fontWeight: '600'
                }}>
                  ✗ {userNameValidationError ? 'Invalid' : 'Taken'}
                </div>
              )}
            </div>
            {userNameValidationError && (
              <p style={{ 
                fontSize: '12px', 
                color: '#ef4444', 
                margin: '4px 0 0 0',
                fontWeight: '500'
              }}>
                {userNameValidationError}
              </p>
            )}
            <p style={{ 
              fontSize: '12px', 
              color: '#b4bdc2', 
              margin: '4px 0 0 0',
              opacity: 0.8
            }}>
              3-20 characters, letters/numbers/underscores/hyphens only, no spaces
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
            disabled={loading || checkingUserName || userNameAvailable === false || userNameValidationError}
            style={{
              width: '100%',
              background: (loading || checkingUserName || userNameAvailable === false || userNameValidationError)
                ? '#005479' 
                : 'linear-gradient(135deg, #f5a302, #ffc020)',
              color: (loading || checkingUserName || userNameAvailable === false || userNameValidationError) ? '#b4bdc2' : '#0c1e34',
              padding: '16px',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: (loading || checkingUserName || userNameAvailable === false || userNameValidationError) ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: (loading || checkingUserName || userNameAvailable === false || userNameValidationError)
                ? 'none' 
                : '0 4px 12px rgba(245, 163, 2, 0.3)',
              outline: 'none'
            }}
            onMouseEnter={(e) => {
              if (!loading && !checkingUserName && userNameAvailable !== false && !userNameValidationError) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(245, 163, 2, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && !checkingUserName && userNameAvailable !== false && !userNameValidationError) {
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