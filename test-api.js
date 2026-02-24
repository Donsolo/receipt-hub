const { SignJWT } = require('jose');

async function testApi() {
    const secretKey = new TextEncoder().encode('fallback-secret-for-dev-only-change-in-prod');
    const token = await new SignJWT({
        userId: 'cmlr90e6s0000v6zokd62jyg6', // dariusreeder@gmail.com
        email: 'dariusreeder@gmail.com',
        role: 'USER',
        isActivated: true
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(secretKey);

    console.log("Generated Token:", token);

    const timestamp = Date.now();
    const res = await fetch(`http://localhost:3000/api/connections?t=${timestamp}`, {
        headers: {
            cookie: `auth_token=${token}`,
            'Cache-Control': 'no-cache'
        }
    });

    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Data:", JSON.stringify(data, null, 2));
}

testApi().catch(console.error);
