import express from 'express'
import { OAuth2Client} from 'google-auth-library'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = 3000

const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
)

app.get('/', (req, res) => {
    const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['email', 'profile', 'openid'],
    });
    res.send(`<a href="${url}"> Login com Google<a/>`)
});

app.get('/callback', async (req, res) => {
    try {
      const { code } = req.query;
      const { tokens } = await client.getToken(code);
      client.setCredentials(tokens);
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      console.log(payload)
      const name = encodeURIComponent(payload.name);
      const email = encodeURIComponent(payload.email);
      const avatar = encodeURIComponent(payload.picture)
      const domain = encodeURIComponent(payload.hd)
      // Redirects to the welcome page with parameters
      const params = new URLSearchParams()
      
      params.append('name', name)
      params.append('email', email)
      params.append('avatar', avatar)
      params.append('domain', domain)

      res.redirect(`/welcome?${params.toString()}`);
    
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(500).send('Error authenticating with Google.');
    }
  });

  app.get('/welcome', async (req, res) => {
    const { name, email, avatar, domain } = req.query;

    // Decoding the URL-encoded parameters if they exist
    const decodedName = name ? decodeURIComponent(name) : undefined;
    const decodedEmail = email ? decodeURIComponent(email) : undefined;
    const decodedAvatar = avatar ? decodeURIComponent(avatar) : undefined;
    const decodedDomain = domain ? decodeURIComponent(domain) : undefined; 
    
    function extractDomain(domain) {
        const parts = domain.split('.');
        
        // If there are multiple parts, return the second-to-last part (last domain before TLD)
        if (parts.length > 1) {
            return parts[parts.length - 2];  // Second to last part
        }
    
        // If there's only one part (like 'google'), return the domain itself
        return domain;
    }

    var provider = extractDomain(decodedDomain)
    
    
    async function logout(){
        console.log(client.credentials.tokens)
        await client.revokeCredentials()  
    }
    res.send(`
      <style>
        body {
          font-family: Arial, sans-serif;
          text-align: left;
        }
        .welcome-container {
          display: flex;
          align-items: center;
          justify-content: start;
          gap: 20px;
          margin-bottom: 20px;
        }
        .welcome-container img {
          border-radius: 100%;
          width: 80px;
          height: 80px;
        }
      </style>
      <div class="welcome-container">
        <img src="${decodedAvatar}" alt="Avatar" />
        <h1>Welcome, ${decodedName}!</h1>
      </div>
      <p>Your email: ${decodedEmail}</p>
      <p>Provider: ${provider.toUpperCase()}</p>
      <button> Logout </button>
    `);
  });
  
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });