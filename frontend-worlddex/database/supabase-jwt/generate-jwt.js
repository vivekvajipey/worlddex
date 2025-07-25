const fs = require('fs');
const jwt = require('jsonwebtoken');

// Your information from Apple Developer account
const privateKey = fs.readFileSync('AuthKey_575MHYHU4W.p8').toString();
const teamId = '69G7HE4MM9'; // Your Apple Developer Team ID
const clientId = 'com.worlddex-jsv.app'; // Your Services ID (same as Client ID)
const keyId = '575MHYHU4W'; // The Key ID of your private key

// Create the JWT with maximum allowed expiration
const token = jwt.sign({}, privateKey, {
  algorithm: 'ES256',
  expiresIn: '15777000s', // ~6 months in seconds (maximum Apple allows)
  audience: 'https://appleid.apple.com',
  issuer: teamId,
  subject: clientId,
  keyid: keyId
});

console.log(token);