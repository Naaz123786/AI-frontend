"use client";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Profile from "./Profile";

export default function UserAvatar() {
  const { user, signOut } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  const handleSignOut = async () => {
    await signOut();
    setShowDropdown(false);
    router.push('/');
  };

  const handleProfileClick = () => {
    setShowDropdown(false);
    setShowProfileModal(true);
  };

  return (
    <>
      <div className="user-avatar-container" ref={dropdownRef}>
        <div 
          className="user-avatar" 
          onClick={() => setShowDropdown(!showDropdown)}
          title={`${getUserDisplayName()} - Click to view menu`}
        >
          {getUserInitial()}
        </div>
        
        {showDropdown && (
          <div className="user-dropdown">
            <div className="dropdown-header">
              <div className="dropdown-avatar">
                {getUserInitial()}
              </div>
              <div className="dropdown-user-info">
                <div className="dropdown-name">{getUserDisplayName()}</div>
                <div className="dropdown-email">{user?.email}</div>
              </div>
            </div>
            
            <div className="dropdown-divider"></div>
            
            <div className="dropdown-menu">
              <button className="dropdown-item" onClick={handleProfileClick}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>View Profile</span>
              </button>
              
              <button className="dropdown-item" onClick={() => router.push('/interview')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>Interview Assistant</span>
              </button>
              
              <div className="dropdown-divider"></div>
              
              <button className="dropdown-item signout" onClick={handleSignOut}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Profile Modal */}
      <Profile 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
      />
      
      <style jsx>{`
        .user-avatar-container {
          position: relative;
          display: flex;
          align-items: center;
        }
        
        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(45deg, #6366f1, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 2px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }
        
        .user-avatar:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
          border-color: rgba(255, 255, 255, 0.5);
        }
        
        .user-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.2);
          min-width: 280px;
          z-index: 1000;
          animation: dropdownSlide 0.2s ease-out;
        }
        
        @keyframes dropdownSlide {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .dropdown-header {
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .dropdown-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(45deg, #6366f1, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 1.2rem;
        }
        
        .dropdown-user-info {
          flex: 1;
        }
        
        .dropdown-name {
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 2px;
        }
        
        .dropdown-email {
          font-size: 0.875rem;
          color: #6b7280;
        }
        
        .dropdown-divider {
          height: 1px;
          background: rgba(0, 0, 0, 0.1);
          margin: 0 16px;
        }
        
        .dropdown-menu {
          padding: 8px;
        }
        
        .dropdown-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border: none;
          background: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background-color 0.2s ease;
          color: #374151;
          font-size: 0.875rem;
          text-align: left;
        }
        
        .dropdown-item:hover {
          background: rgba(99, 102, 241, 0.1);
        }
        
        .dropdown-item.signout {
          color: #dc2626;
        }
        
        .dropdown-item.signout:hover {
          background: rgba(239, 68, 68, 0.1);
        }
        
        .dropdown-item svg {
          width: 18px;
          height: 18px;
        }
        
        .dropdown-item span {
          font-weight: 500;
        }
        
        /* Mobile responsive styles */
        @media (max-width: 768px) {
          .user-avatar {
            width: 32px;
            height: 32px;
            font-size: 0.875rem;
          }
          
          .user-dropdown {
            min-width: 260px;
            right: -8px;
          }
          
          .dropdown-header {
            padding: 12px;
          }
          
          .dropdown-avatar {
            width: 40px;
            height: 40px;
            font-size: 1rem;
          }
          
          .dropdown-name {
            font-size: 0.9rem;
          }
          
          .dropdown-email {
            font-size: 0.8rem;
          }
        }
        
        @media (max-width: 480px) {
          .user-avatar {
            width: 28px;
            height: 28px;
            font-size: 0.8rem;
          }
          
          .user-dropdown {
            min-width: 240px;
            right: -16px;
          }
          
          .dropdown-header {
            padding: 10px;
            gap: 8px;
          }
          
          .dropdown-avatar {
            width: 36px;
            height: 36px;
            font-size: 0.95rem;
          }
          
          .dropdown-name {
            font-size: 0.85rem;
          }
          
          .dropdown-email {
            font-size: 0.75rem;
          }
          
          .dropdown-item {
            padding: 10px 12px;
            font-size: 0.8rem;
          }
          
          .dropdown-item svg {
            width: 16px;
            height: 16px;
          }
        }
      `}</style>
    </>
  );
}
