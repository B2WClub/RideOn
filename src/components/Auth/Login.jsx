import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { Bike, Mail, Lock, AlertCircle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (error) {
      setError('Failed to sign in. Please check your credentials.');
    }

    setLoading(false);
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
        maxWidth: '400px',
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
          }}>RideOn</h1>
          <p style={{ 
            color: '#b4bdc2', 
            margin: 0, 
            fontSize: '16px' 
          }}>RideOn - Track miles, build teams, ride together</p>
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
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
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center' }}>
          <p style={{ 
            fontSize: '14px', 
            color: '#b4bdc2',
            margin: '0 0 8px 0'
          }}>
            Received and invite to RideOn?{' '}
            <button
              onClick={() => navigate('/register')}
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
              Register your account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;