const {
  DROPBOX
} = require('./config.json');

const { default: axios } = require('axios');
const fs = require('fs');

module.exports = class Dropbox{
  constructor(){
    this.access_token = "";
  }

  async get_token(){
    const mes = new URLSearchParams();
    mes.append('grant_type', 'refresh_token');
    mes.append('refresh_token', DROPBOX.REF_TOKEN);
    mes.append('client_id', DROPBOX.CLIENT_ID);
    mes.append('client_secret', DROPBOX.CLIENT_SECRET);

    const res = await axios.post('https://api.dropboxapi.com/oauth2/token', mes);

    this.access_token = res.data.access_token;
  }

  // 画像をDropboxにアップロードする関数
  async upload(upload_path, path) {
    const data = fs.readFileSync(path);
    var url = 'https://content.dropboxapi.com/2/files/upload';
    var headers = {
      'Authorization': 'Bearer ' + this.access_token,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': JSON.stringify({
        path: `/${upload_path}`,
        mode: 'overwrite', // 上書きモードに設定
        autorename: false, // 自動リネームを無効に設定
        mute: false
      })
    };

    await axios.post(url, data, { headers })
  }
}
