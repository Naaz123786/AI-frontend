"use client";
import { useState, useEffect } from "react";
import { useAuth } from '@/contexts/AuthContext';
import { useQuestionHistory } from '@/hooks/useQuestionHistory';

interface ProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Profile({ isOpen, onClose }: ProfileProps) {
  const { user, signOut, updateProfile, updatePassword } = useAuth();
  const { questions, deleteQuestion, clearAllQuestions } = useQuestionHistory(user?.id || null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [editingGender, setEditingGender] = useState(false);
  const [selectedGender, setSelectedGender] = useState(user?.user_metadata?.gender || '');
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: user?.user_metadata?.full_name || user?.user_metadata?.name || '',
    phoneNumber: user?.user_metadata?.phone_number || '',
    dateOfBirth: user?.user_metadata?.date_of_birth || '',
    location: user?.user_metadata?.location || '',
    occupation: user?.user_metadata?.occupation || '',
    bio: user?.user_metadata?.bio || '',
    linkedinUrl: user?.user_metadata?.linkedin_url || '',
    githubUrl: user?.user_metadata?.github_url || ''
  });

  // Update form when user data changes
  useEffect(() => {
    if (user?.user_metadata) {
      setProfileForm({
        fullName: user.user_metadata.full_name || user.user_metadata.name || '',
        phoneNumber: user.user_metadata.phone_number || '',
        dateOfBirth: user.user_metadata.date_of_birth || '',
        location: user.user_metadata.location || '',
        occupation: user.user_metadata.occupation || '',
        bio: user.user_metadata.bio || '',
        linkedinUrl: user.user_metadata.linkedin_url || '',
        githubUrl: user.user_metadata.github_url || ''
      });
    }
  }, [user]);

  // Get user's display name or email
  const getUserDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.user_metadata?.name) {
      return user.user_metadata.name;
    }
    return user?.email || "";
  };

  // Get user's initial
  const getUserInitial = () => {
    const displayName = getUserDisplayName();
    if (displayName) {
      return displayName.charAt(0).toUpperCase();
    }
    return "U";
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  const handleDeleteQuestion = (questionId: string) => {
    deleteQuestion(questionId);
    setShowDeleteConfirm(null);
  };

  const handleClearHistory = () => {
    clearAllQuestions();
    setShowDeleteConfirm(null);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    
    try {
      await updatePassword(passwordForm.newPassword);
      alert('Password updated successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordChange(false);
    } catch (error) {
      console.error('Password update error:', error);
      alert('Failed to update password. Please try again.');
    }
  };

  const handleDeleteAccount = () => {
    // TODO: Implement account deletion logic
    console.log('Account deletion requested');
    setShowDeleteAccount(false);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({
        full_name: profileForm.fullName,
        phone_number: profileForm.phoneNumber,
        date_of_birth: profileForm.dateOfBirth,
        location: profileForm.location,
        occupation: profileForm.occupation,
        bio: profileForm.bio,
        linkedin_url: profileForm.linkedinUrl,
        github_url: profileForm.githubUrl,
        gender: selectedGender
      });
      alert('Profile updated successfully!');
      setEditingProfile(false);
    } catch (error) {
      console.error('Profile update error:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  const handleProfileFormChange = (field: string, value: string) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
  };

  const cancelProfileEdit = () => {
    setProfileForm({
      fullName: user?.user_metadata?.full_name || user?.user_metadata?.name || '',
      phoneNumber: user?.user_metadata?.phone_number || '',
      dateOfBirth: user?.user_metadata?.date_of_birth || '',
      location: user?.user_metadata?.location || '',
      occupation: user?.user_metadata?.occupation || '',
      bio: user?.user_metadata?.bio || '',
      linkedinUrl: user?.user_metadata?.linkedin_url || '',
      githubUrl: user?.user_metadata?.github_url || ''
    });
    setEditingProfile(false);
  };

  const formatDate = (timestamp: Date | number) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  if (!isOpen) return null;

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-header">
          <button className="profile-close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="profile-info">
            <div className="profile-avatar">
              {getUserInitial()}
            </div>
            <div className="profile-details">
              <h2 className="profile-name">{getUserDisplayName()}</h2>
              <p className="profile-email">{user?.email}</p>
            </div>
          </div>
        </div>

        <div className="profile-content">
          {/* User Information Section */}
          <div className="profile-section">
            <div className="section-header">
              <h3 className="section-title">Personal Information</h3>
              {!editingProfile ? (
                <button 
                  type="button" 
                  className="edit-profile-btn"
                  onClick={() => setEditingProfile(true)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Profile
                </button>
              ) : (
                <div className="profile-edit-actions">
                  <button 
                    type="button" 
                    className="save-profile-btn"
                    onClick={handleProfileUpdate}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </button>
                  <button 
                    type="button" 
                    className="cancel-profile-btn"
                    onClick={cancelProfileEdit}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6m0 12L6 6" />
                    </svg>
                    Cancel
                  </button>
                </div>
              )}
            </div>
            
            {!editingProfile ? (
              /* Display Mode */
              <div className="profile-display-grid">
                <div className="profile-info-card">
                  <h4 className="info-card-title">Basic Information</h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <label className="info-label">Full Name</label>
                      <span className="info-value">{profileForm.fullName || 'Not specified'}</span>
                    </div>
                    <div className="info-item">
                      <label className="info-label">Email Address</label>
                      <span className="info-value">{user?.email}</span>
                    </div>
                    <div className="info-item">
                      <label className="info-label">Phone Number</label>
                      <span className="info-value">{profileForm.phoneNumber || 'Not specified'}</span>
                    </div>
                    <div className="info-item">
                      <label className="info-label">Date of Birth</label>
                      <span className="info-value">{profileForm.dateOfBirth || 'Not specified'}</span>
                    </div>
                    <div className="info-item">
                      <label className="info-label">Gender</label>
                      <span className="info-value">{user?.user_metadata?.gender || 'Not specified'}</span>
                    </div>
                    <div className="info-item">
                      <label className="info-label">Location</label>
                      <span className="info-value">{profileForm.location || 'Not specified'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="profile-info-card">
                  <h4 className="info-card-title">Professional Information</h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <label className="info-label">Occupation</label>
                      <span className="info-value">{profileForm.occupation || 'Not specified'}</span>
                    </div>
                    <div className="info-item full-width">
                      <label className="info-label">Bio</label>
                      <span className="info-value bio-text">{profileForm.bio || 'No bio added yet'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="profile-info-card">
                  <h4 className="info-card-title">Social Links</h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <label className="info-label">LinkedIn</label>
                      {profileForm.linkedinUrl ? (
                        <a href={profileForm.linkedinUrl} target="_blank" rel="noopener noreferrer" className="info-link">
                          View LinkedIn Profile
                        </a>
                      ) : (
                        <span className="info-value">Not specified</span>
                      )}
                    </div>
                    <div className="info-item">
                      <label className="info-label">GitHub</label>
                      {profileForm.githubUrl ? (
                        <a href={profileForm.githubUrl} target="_blank" rel="noopener noreferrer" className="info-link">
                          View GitHub Profile
                        </a>
                      ) : (
                        <span className="info-value">Not specified</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Edit Mode */
              <form onSubmit={handleProfileUpdate} className="profile-edit-form">
                <div className="form-section">
                  <h4 className="form-section-title">Basic Information</h4>
                  <div className="profile-form-grid">
                    <div className="form-group">
                      <label className="form-label">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="form-icon">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Full Name
                      </label>
                      <input 
                        type="text" 
                        value={profileForm.fullName}
                        onChange={(e) => handleProfileFormChange('fullName', e.target.value)}
                        className="form-input"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="form-icon">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Phone Number
                      </label>
                      <input 
                        type="tel" 
                        value={profileForm.phoneNumber}
                        onChange={(e) => handleProfileFormChange('phoneNumber', e.target.value)}
                        className="form-input"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="form-icon">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        Date of Birth
                      </label>
                      <input 
                        type="date" 
                        value={profileForm.dateOfBirth}
                        onChange={(e) => handleProfileFormChange('dateOfBirth', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="form-icon">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Location
                      </label>
                      <input 
                        type="text" 
                        value={profileForm.location}
                        onChange={(e) => handleProfileFormChange('location', e.target.value)}
                        className="form-input"
                        placeholder="City, Country"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Gender</label>
                      <select 
                        value={selectedGender} 
                        onChange={(e) => setSelectedGender(e.target.value)}
                        className="form-select"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Non-binary">Non-binary</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="form-section">
                  <h4 className="form-section-title">Professional Information</h4>
                  <div className="profile-form-grid">
                    <div className="form-group full-width">
                      <label className="form-label">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="form-icon">
                          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                          <line x1="8" y1="21" x2="16" y2="21"></line>
                          <line x1="12" y1="17" x2="12" y2="21"></line>
                        </svg>
                        Occupation
                      </label>
                      <input 
                        type="text" 
                        value={profileForm.occupation}
                        onChange={(e) => handleProfileFormChange('occupation', e.target.value)}
                        className="form-input"
                        placeholder="Software Engineer, Designer, etc."
                      />
                    </div>
                    <div className="form-group full-width">
                      <label className="form-label">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="form-icon">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        Bio
                      </label>
                      <textarea 
                        value={profileForm.bio}
                        onChange={(e) => handleProfileFormChange('bio', e.target.value)}
                        className="form-textarea"
                        placeholder="Tell us about yourself..."
                        rows={4}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="form-section">
                  <h4 className="form-section-title">Social Links</h4>
                  <div className="profile-form-grid">
                    <div className="form-group">
                      <label className="form-label">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="form-icon">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 00-2 2H10a2 2 0 00-2-2V6m8 0H8m0 0v.01M16 20v.01M8 20v.01" />
                        </svg>
                        LinkedIn URL
                      </label>
                      <input 
                        type="url" 
                        value={profileForm.linkedinUrl}
                        onChange={(e) => handleProfileFormChange('linkedinUrl', e.target.value)}
                        className="form-input"
                        placeholder="https://linkedin.com/in/yourprofile"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="form-icon">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                        </svg>
                        GitHub URL
                      </label>
                      <input 
                        type="url" 
                        value={profileForm.githubUrl}
                        onChange={(e) => handleProfileFormChange('githubUrl', e.target.value)}
                        className="form-input"
                        placeholder="https://github.com/yourusername"
                      />
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Password Change Section */}
          <div className="profile-section">
            <h3 className="section-title">Security</h3>
            {!showPasswordChange ? (
              <button 
                className="change-password-btn"
                onClick={() => setShowPasswordChange(true)}
              >
                Change Password
              </button>
            ) : (
              <form onSubmit={handlePasswordChange} className="password-form">
                <div className="form-group">
                  <label>Current Password</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
                <div className="password-form-actions">
                  <button type="button" className="cancel-btn" onClick={() => {
                    setShowPasswordChange(false);
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}>
                    Cancel
                  </button>
                  <button type="submit" className="save-btn">
                    Save Change Password
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Question History Section */}
          <div className="profile-section">
            <h3 className="section-title">Question History</h3>
            <div className="history-stats">
              <span className="stat-item">
                <strong>{questions.length}</strong> questions asked
              </span>
            </div>
            
            {questions.length > 0 && (
              <div className="history-actions">
                <button 
                  className="clear-all-btn"
                  onClick={() => setShowDeleteConfirm('all')}
                >
                  Clear All History
                </button>
              </div>
            )}

            <div className="questions-list">
              {questions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">💭</div>
                  <p>No questions asked yet.</p>
                  <p className="empty-state-subtext">Start your first interview to see your question history here!</p>
                </div>
              ) : (
                <div className="questions-grid">
                  {questions.map((question) => (
                    <div key={question.id} className="question-card">
                      <div className="question-header">
                        <div className="question-meta">
                          <span className="question-index">Q{questions.indexOf(question) + 1}</span>
                          <span className="question-date">
                            {formatDate(question.timestamp)}
                          </span>
                        </div>
                        <button 
                          className="delete-question-btn"
                          onClick={() => setShowDeleteConfirm(question.id)}
                          title="Delete this question"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      <div className="question-content">
                        <div className="question-text-container">
                          <p className="question-text">
                            {question.question.length > 120 
                              ? question.question.substring(0, 120) + '...' 
                              : question.question}
                          </p>
                          {question.question.length > 120 && (
                            <button 
                              className="expand-btn"
                              onClick={() => {
                                const element = document.getElementById(`q-${question.id}`);
                                if (element) {
                                  element.classList.toggle('expanded');
                                }
                              }}
                              title="Click to read full question"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          )}
                        </div>
                        <div id={`q-${question.id}`} className="full-question-text">
                          <p className="full-question">{question.question}</p>
                          <div className="question-answer">
                            <h4>Answer:</h4>
                            <p className="answer-preview">
                              {question.answer.length > 200 
                                ? question.answer.substring(0, 200) + '...' 
                                : question.answer}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="profile-actions">
            <button className="signout-btn" onClick={handleSignOut}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
            <button className="delete-account-btn" onClick={() => setShowDeleteAccount(true)}>
              <svg className="delete-icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Account
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="delete-confirm-overlay">
            <div className="delete-confirm-modal">
              <h3>Confirm Delete</h3>
              <p>
                {showDeleteConfirm === 'all' 
                  ? 'Are you sure you want to clear all your question history? This action cannot be undone.'
                  : 'Are you sure you want to delete this question?'
                }
              </p>
              <div className="delete-confirm-actions">
                <button 
                  className="cancel-btn"
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  Cancel
                </button>
                <button 
                  className="confirm-delete-btn"
                  onClick={() => showDeleteConfirm === 'all' ? handleClearHistory() : handleDeleteQuestion(showDeleteConfirm)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Account Confirmation Modal */}
        {showDeleteAccount && (
          <div className="delete-confirm-overlay">
            <div className="delete-confirm-modal">
              <h3>Delete Account</h3>
              <p>
                Are you sure you want to delete your account? This action is permanent and cannot be undone. 
                All your data including question history will be lost.
              </p>
              <div className="delete-confirm-actions">
                <button 
                  className="cancel-btn"
                  onClick={() => setShowDeleteAccount(false)}
                >
                  Cancel
                </button>
                <button 
                  className="confirm-delete-btn danger"
                  onClick={handleDeleteAccount}
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
