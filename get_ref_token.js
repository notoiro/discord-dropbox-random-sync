const {
  DROPBOX
} = require('./config.json');
const { default: axios } = require('axios');

const GetRefreshToken = async () => {
  const mes = new URLSearchParams();
  mes.append('grant_type', 'authorization_code');
  mes.append('code', process.argv[2]);
  mes.append('client_id', DROPBOX.CLIENT_ID);
  mes.append('client_secret', DROPBOX.CLIENT_SECRET);

  const res = await axios.post('https://api.dropboxapi.com/oauth2/token', mes);

  console.log(res);
  const token = res.data.refresh_token;

  console.log(`success! token is: ${token}`);
}

GetRefreshToken();

