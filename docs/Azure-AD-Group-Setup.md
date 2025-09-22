# Azure AD Group-Based Authentication Setup

This guide explains how to set up Azure AD group-based authentication for the EI-Expenses application.

## Overview

The application now uses Azure AD group membership to control access:

1. **Group Membership Required**: Only users who are members of a designated Azure AD security group can access the application
2. **Automatic Login Control**: The automatic login setting controls whether group members can bypass manual login or must authenticate explicitly

## Setup Steps

### 1. Create Azure AD Security Group

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **Groups**
3. Click **+ New group**
4. Configure the group:
   - **Group type**: Security
   - **Group name**: `EI-Expenses Users` (or your preferred name)
   - **Group description**: `Users authorized to access the EI-Expenses application`
   - **Membership type**: Assigned (recommended for security)
5. Click **Create**
6. **Copy the Object ID** - you'll need this for the environment variable

### 2. Add Users to the Group

1. Open the newly created group
2. Go to **Members** > **+ Add members**
3. Search for and select users who should have access to the application
4. Click **Select** to add them

### 3. Configure Application Permissions

Your Azure AD application needs permission to read group membership:

1. Go to **Azure Active Directory** > **App registrations**
2. Find and open your EI-Expenses application
3. Go to **API permissions**
4. Click **+ Add a permission**
5. Select **Microsoft Graph** > **Application permissions**
6. Add these permissions:
   - `GroupMember.Read.All`
   - `User.Read.All` (if not already added)
7. Click **Grant admin consent** for your tenant

### 4. Update Environment Variables

Add the group ID to your `.env.local` file:

```env
# Azure AD Authentication
AZURE_AD_TENANT_ID=your-tenant-id
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret
AZURE_AD_ALLOWED_GROUP_ID=your-group-object-id  # Add this line
NEXTAUTH_SECRET=your-nextauth-secret
```

## How It Works

### Authentication Flow

1. **User attempts to sign in**
2. **Azure AD authentication** occurs (standard OAuth flow)
3. **Group membership check** - the application checks if the user is a member of the allowed group
4. **Access decision**:
   - ✅ **Group member**: User gains access to the application
   - ❌ **Not a group member**: Login fails with access denied

### Automatic Login Behavior

The **Automatic Login** setting in the application controls the authentication experience:

#### Automatic Login = ON (Default)
- **First visit**: User authenticates normally
- **Return visits**: Application attempts silent authentication
- **Success**: User bypasses login screen (if browser session exists)
- **Fail**: User sees login screen and must authenticate

#### Automatic Login = OFF
- **All visits**: User must explicitly authenticate
- **No silent authentication** attempted
- **Forces account selection** on every login attempt

## Security Considerations

1. **Group Membership**: Only users in the designated group can access the application
2. **Token Validation**: Group membership is checked during the initial authentication
3. **Session Management**: Existing sessions are honored based on the automatic login setting
4. **Access Denial**: Users not in the group will see an authentication error

## Troubleshooting

### Common Issues

1. **Permission Errors**: Ensure `GroupMember.Read.All` permission is granted with admin consent
2. **Group Not Found**: Verify the `AZURE_AD_ALLOWED_GROUP_ID` matches the group's Object ID
3. **Access Denied**: Check that the user is actually a member of the group

### Debug Information

The application logs authentication events to the browser console:

- `🔐 Azure AD sign in - checking group membership`
- `✅ User is authorized - group membership confirmed`
- `❌ User is NOT authorized - not member of allowed group`

### Testing

1. **Add yourself** to the group for testing
2. **Test with different users** to verify group membership enforcement
3. **Toggle automatic login** to test both behaviors
4. **Check browser console** for detailed authentication logs

## Configuration Options

If you don't set `AZURE_AD_ALLOWED_GROUP_ID`, the application will:
- Log a warning: `⚠️ No AZURE_AD_ALLOWED_GROUP_ID configured, allowing all users`
- Allow all authenticated users (not recommended for production)

For production use, always configure the group ID to restrict access to authorized users only.