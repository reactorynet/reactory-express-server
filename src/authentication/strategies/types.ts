/**
 * TypeScript Type Definitions for Authentication Strategies
 * 
 * Centralized type definitions for OAuth profiles, strategy callbacks,
 * and authentication-related interfaces.
 */

import Reactory from '@reactory/reactory-core';

/**
 * Base OAuth Profile Interface
 * Common structure across OAuth2 providers (Google, Facebook, GitHub, LinkedIn)
 */
export interface OAuthProfile {
  id: string;
  displayName: string;
  username?: string;
  name?: {
    familyName?: string;
    givenName?: string;
    middleName?: string;
  };
  emails?: {
    value: string;
    verified?: boolean;
  }[];
  photos?: {
    value: string;
  }[];
  _json?: Record<string, any>;
}

/**
 * Google OAuth Profile
 * Extends base profile with Google-specific fields
 */
export interface GoogleProfile extends OAuthProfile {
  _json: {
    sub: string;
    name: string;
    given_name: string;
    family_name: string;
    picture: string;
    email: string;
    email_verified: boolean;
    locale?: string;
  };
}

/**
 * Facebook OAuth Profile
 * Extends base profile with Facebook-specific fields
 */
export interface FacebookProfile extends OAuthProfile {
  profileUrl?: string;
  _json: {
    id: string;
    email?: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    picture?: {
      data: {
        url: string;
        is_silhouette: boolean;
      };
    };
  };
}

/**
 * GitHub OAuth Profile
 * Extends base profile with GitHub-specific fields
 */
export interface GithubProfile extends OAuthProfile {
  profileUrl?: string;
  _json: {
    login: string;
    id: number;
    avatar_url: string;
    name?: string;
    email?: string;
    bio?: string;
    company?: string;
    location?: string;
    blog?: string;
  };
}

/**
 * LinkedIn OAuth Profile
 * Extends base profile with LinkedIn-specific fields
 */
export interface LinkedInProfile extends OAuthProfile {
  _json: {
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
    locale?: string;
  };
}

/**
 * Microsoft/Azure AD OIDC Profile
 * Extends base profile with Microsoft-specific fields
 */
export interface MicrosoftProfile {
  oid: string;
  displayName: string;
  name?: {
    familyName?: string;
    givenName?: string;
  };
  emails?: {
    value: string;
  }[];
  _json?: {
    email?: string;
    preferred_username?: string;
    given_name?: string;
    family_name?: string;
    name?: string;
    picture?: string;
    tid?: string; // Tenant ID
  };
}

/**
 * Okta OIDC Profile
 * Extends base profile with Okta-specific fields
 */
export interface OktaProfile {
  id: string; // Okta user ID (sub claim)
  displayName: string;
  name?: {
    familyName?: string;
    givenName?: string;
  };
  emails?: {
    value: string;
  }[];
  photos?: {
    value: string;
  }[];
  _json?: {
    sub: string;
    email?: string;
    preferred_username?: string;
    given_name?: string;
    family_name?: string;
    name?: string;
    picture?: string;
    locale?: string;
  };
}

/**
 * Passport Done Callback
 * Standard callback for Passport.js strategy verification
 */
export type PassportDoneCallback = (
  error: Error | null,
  user?: Partial<Reactory.Models.IUserDocument> | string | false,
  info?: any
) => void;

/**
 * OAuth2 Strategy Callback
 * Standard callback signature for OAuth2 strategies
 */
export type OAuth2StrategyCallback = (
  req: Reactory.Server.ReactoryExpressRequest,
  accessToken: string,
  refreshToken: string,
  profile: OAuthProfile,
  done: PassportDoneCallback
) => void | Promise<void>;

/**
 * OIDC Strategy Callback (Microsoft, Okta)
 * Standard callback signature for OIDC strategies
 */
export type OIDCStrategyCallback = (
  req: Reactory.Server.ReactoryExpressRequest,
  issuer: string,
  profile: MicrosoftProfile | OktaProfile,
  jwtClaims: any,
  accessToken: string,
  refreshToken: string,
  params: any,
  done: PassportDoneCallback
) => void | Promise<void>;

/**
 * Authentication Properties
 * Stored in user.authentications array
 */
export interface AuthenticationProps {
  provider: string;
  lastLogin: Date;
  props: {
    [key: string]: any;
    access_token?: string;
    refresh_token?: string;
  };
}

/**
 * Login Token Response
 * Returned after successful authentication
 */
export interface LoginTokenResponse {
  id: string;
  firstName: string;
  lastName: string;
  token: string;
}

/**
 * JWT Token Payload
 * Structure of JWT tokens issued by the system
 */
export interface JWTTokenPayload {
  userId: string;
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  refresh: string;
  name: string;
}

/**
 * Strategy State Data
 * Encoded in state parameter for CSRF protection
 */
export interface StrategyStateData {
  clientKey: string;
  partnerId?: string;
  timestamp?: number;
  nonce?: string;
}

/**
 * User Service Interface
 * Methods required from UserService
 */
export interface IUserService {
  findUserWithEmail(email: string): Promise<Reactory.Models.IUserDocument | null>;
  createUser(userData: {
    email: string;
    firstName: string;
    lastName: string;
  }): Promise<Reactory.Models.IUserDocument>;
}

/**
 * Type guard to check if profile is GoogleProfile
 */
export function isGoogleProfile(profile: any): profile is GoogleProfile {
  return profile?._json?.sub && profile?._json?.email_verified !== undefined;
}

/**
 * Type guard to check if profile is FacebookProfile
 */
export function isFacebookProfile(profile: any): profile is FacebookProfile {
  return profile?._json?.id && profile?.provider === 'facebook';
}

/**
 * Type guard to check if profile is GithubProfile
 */
export function isGithubProfile(profile: any): profile is GithubProfile {
  return profile?._json?.login && profile?._json?.avatar_url;
}

/**
 * Type guard to check if profile is LinkedInProfile
 */
export function isLinkedInProfile(profile: any): profile is LinkedInProfile {
  return profile?._json?.sub && profile?.provider === 'linkedin';
}

/**
 * Type guard to check if profile is MicrosoftProfile
 */
export function isMicrosoftProfile(profile: any): profile is MicrosoftProfile {
  return profile?.oid && profile?._json?.tid;
}

/**
 * Type guard to check if profile is OktaProfile
 */
export function isOktaProfile(profile: any): profile is OktaProfile {
  return profile?.id && profile?._json?.sub && !profile?._json?.tid;
}

/**
 * Export all types
 */
export type {
  PassportDoneCallback as OnDoneCallback,
};

