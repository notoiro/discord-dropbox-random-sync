const {
  Client, GatewayIntentBits,
} = require('discord.js');
const sharp = require('sharp');
const cron = require('node-cron');

const Dropbox = require('./dropbox.js');
const donwload = require('./download.js');

const current_date = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = ('0' + (now.getMonth() + 1)).slice(-2);
  const day = ('0' + now.getDate()).slice(-2);
  const hours = ('0' + now.getHours()).slice(-2);
  const minutes = ('0' + now.getMinutes()).slice(-2);
  const seconds = ('0' + now.getSeconds()).slice(-2);

  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
}

const {
  DISCORD_TOKEN, TMP_FOLDER, LINKLIST
} = require('./config.json');

const VRC_MAX = 2048;
const WEBP_OPT = {
  quality: 100,
  lossless: true
}

class App{
  constructor(){
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds]
    });

    this.dropbox = new Dropbox();
  }

  async start(){
    this.setup_discord();

    this.client.login(DISCORD_TOKEN);
  }

  setup_discord(){
    const command = [
      {
        name: "update",
        description: "せっかく作ったのでとりあえずね",
      },
    ]
    this.client.on('ready', async () => {
      await this.client.application.commands.set(command);
      this.update_images();
      cron.schedule('*/5 * * * *', this.update_images.bind(this));
    });

    this.client.on('interactionCreate', this.onInteraction.bind(this));
  }

  async onInteraction(interaction){
    if(!(interaction.isChatInputCommand())) return;
    if(!(interaction.inGuild())) return;

    if(interaction.commandName === 'update'){
      const links = LINKLIST.filter(v => v.GUILD === interaction.guild.id);
      if(!links.length){
        await interaction.reply('設定ないかも');
        return;
      }
      await interaction.deferReply();
      for(let link of links){
        await this.update_image(link);
      }

      await interaction.followUp('アップデートするね');
    }
  }

  async get_all_images(id){
    let messages = [];
    try{
      const channel = await this.client.channels.fetch(id);

      let message = await channel.messages.fetch({ limit: 1 })
        .then(messagePage => (messagePage.size === 1 ? messagePage.at(0) : null));

      messages.push(message);

      while(message){
        await channel.messages.fetch({ limit: 100, before: message.id })
          .then(messagePage => {
            messagePage.forEach(msg => messages.push(msg));

            message = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
          });
      }

      return messages;
    }catch(e){
      console.log(e);
      return [];
    }
  }

  filter_images(arr){
    const result = [];

    for(let a of arr){
      if(a.attachments.size !== 0){
        a.attachments.forEach(file => {
          if(
            file.contentType === 'image/webp' ||
            file.contentType === 'image/jpeg' ||
            file.contentType === 'image/png'
          ) result.push(file);
        })
      }
    }

    return result;
  }

  async update_images(){
    for(let link of LINKLIST){
      await this.update_image(link);
    }
  }

  async update_image(link){
    try{
      await this.dropbox.get_token();
      let posts = [];
      for(let channle of link.CHANNELS){
        posts = posts.concat(await this.get_all_images(channle));
      }

      const images = this.filter_images(posts);
      const rand_img = [];

      for (var i = 0; i < link.DROPBOX_IMAGE_COUNT; i++) {
        var idx = Math.floor(Math.random() * images.length);
        rand_img.push(images.splice(idx, 1));
      }

      let count = 0;
      for(let i of rand_img){
        await this._update_image(link, i, count);

        count++;
      }

      const log =
`Update info
  time: ${current_date()}
  channel image post count: ${posts.length}
  images count: ${images.length}
  update count: ${link.DROPBOX_IMAGE_COUNT}`;
      console.log(log);
    }catch(e){
      console.log(e)
    }
  }

  async _update_image(link, image, count){
    const file = image[0];
    const path = `${TMP_FOLDER}/dis_to_drop_image_${link.ID}_${count}`;

    await donwload(file.url, path);
    const resized = await this.resize(path, `dis_to_drop_resized_${link.ID}_${count}.webp`, file.width, file.height);

    await this.dropbox.upload(`${link.DROPBOX_FOLDER_PATH}/${count}.webp`, resized);
  }

  async resize(path, name, w, h){
    const f_path = `${TMP_FOLDER}/${name}`;

    if(w < VRC_MAX && h < VRC_MAX){
      await sharp(path).webp(WEBP_OPT).toFile(f_path);
    }else{
      if(w < h){
        await sharp(path).resize(null, VRC_MAX).webp(WEBP_OPT).toFile(f_path);
      }else{
        await sharp(path).resize(VRC_MAX).webp(WEBP_OPT).toFile(f_path);
      }
    }

    return f_path;
  }
}

function main(){
  const app = new App();

  app.start();
}

main();
