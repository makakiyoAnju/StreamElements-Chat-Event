class TwitchPubSub {
  constructor(channel) {
    this.topic = `dashboard-activity-feed.${channel}`;
  };

  connect() {
    return new Promise((res,rej) => {
      setTimeout(_=> {
        this.connection = new WebSocket('wss://pubsub-edge.twitch.tv');
        this.connection.onopen = this.onOpen.bind(this);
        this.connection.onmessage = this.onRedeem.bind(this);
        this.connection.onclose = this.onClose.bind(this);
        res();
      }, 7500);
    })
  };

  onOpen() {
    console.log('PubSub Opened');
    this.ping();
    this.listen();
    this.heartbeat = setInterval(this.ping.bind(this), 1000 * 120);
  };

  listen() {
    this.connection.send(
      JSON.stringify({
        type: 'LISTEN',
        data: {
          topics: [this.topic],
          auth_token: this.token
        }
      }));
  };

  onClose() {
    console.log('PubSub Closed ', Date.now());
    clearInterval(this.heartbeat);
  };

  ping() {
    console.log('PubSub Ping ', Date.now());
    this.connection.send(JSON.stringify({
      type: 'PING'
    }));
  };

  reconnect() {
    console.log('PubSub connection closed By Twitch ', Date.now());
    this.connection.close();
    //handle force reconnect... tbd
  };

  onRedeem({ data: psObject }) {
    psObject = JSON.parse(psObject);
    if (psObject.type === 'RESPONSE') return;
    else if (psObject.type === 'PONG') return;
    else if (psObject.type === 'RECONNECT') return this.reconnect();
    else if (psObject.type === 'MESSAGE' && psObject.data.topic === this.topic) {
      let message = JSON.parse(psObject.data.message);
      if (message.type === 'channel_points_custom_reward_redemption') return this.emitPuSub(message);
    };
  };

  emitPuSub(message) {
    const channelPointEvent = new CustomEvent("onEventReceived", {
      detail: {
        "listener": "reward-redeemed",
        "event": {
          "service": "twitch",
          "data": {
            "time": new Date(message.timestamp).getTime(),
            "tags": message,
            "nick": message.channel_points_redeeming_user.login,
            "userId": message.channel_points_redeeming_user.id,
            "displayName": message.channel_points_redeeming_user.display_name,
            "text": message.channel_points_user_input,
            "rewardId": message.channel_points_reward_id,
            "rewardTitle": message.channel_points_reward_title,
            "id": message.channel_points_redemption_id,
          },
        },
      }
    });
    window.dispatchEvent(channelPointEvent);
  };
};
