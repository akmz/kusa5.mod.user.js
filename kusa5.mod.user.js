// ==UserScript==
// @name        kusa5.mod
// @namespace   net.ghippos.kusa5
// @include     http://www.nicovideo.jp/watch/*
// @version     13
// @grant       none
// @description ニコ動html5表示（改造版）
// ==/UserScript==

//----------------------------------------------------------

// オリジナル
// ==UserScript==
// @name        kusa5
// @namespace   net.buhoho.kusa5
// @include     http://www.nicovideo.jp/watch/*
// @version     1
// @grant       none
// @description ニコ動html5表示
// ==/UserScript==

const OPT = {
  noLimit: false,         // 察してくれ
  autoPlay: true,         // 自動再生の有効/無効
  hidePlaylist: false,    // 再生リストを非表示にする
  showPageTop: false,     // HTML5プレーヤーをページの上部に配置する　Flashプレーヤーには影響なし
  useBuffer: false,       // たぶんFirefoxじゃないと正常に動かない
  debug: false
};

const ASKURL = 'http://flapi.nicovideo.jp/api/getflv?v=';
const THUMB = 'http://tn-skr3.smilevideo.jp/smile?i=';
const WATCH = 'http://www.nicovideo.jp/watch/';
const INFO = 'http://ext.nicovideo.jp/api/getthumbinfo/';
const apidata = JSON.parse($('#watchAPIDataContainer').text());
const launchID = apidata.videoDetail.v; // APIに与える識別子
const isIframe = window != parent;

function generateLines(height, lines) {
  var result = '';
  for (var i = 0; i < lines; i++) {
    result += '#kusa5 .msg.l'+ (i + 1) +' { top: calc((' + height + 'px / '+ lines +') * '+ i +'); }\n';
  }
  return result;
}

addGlobalStyle(`
* {
  min-width: auto !important;
}

#kusa5 {
  position: relative;
  /*background-color: hsla(180, 10%, 0%, 0.8);*/
  background-color: #000;
  overflow: hidden;
  margin: 0 auto;
}
#kusa5 video {
  display: block;
  background-color: #000;
  height: 100%;
  max-width: 100%; /* 画面外にはみ出ないように */
  margin: 0 auto;
}
#wallImageContainer .wallImageCenteringArea .wallAlignmentArea.image2{
  z-index: 3;
  background-color: #272727;
}
#playerContainerWrapper {
  padding: 24px 0;
}

/*
 コントロールパネル関係
 ******************************************************************************/
.controle-panel {
  z-index: 9999;
  color: #fff;
  text-shadow: 2px 1px #000;
  position:absolute;
  bottom: 0;
  width: 100%;
  background: linear-gradient(to bottom, 
                              rgba(0,0,0,0.24) 0%,
                              rgba(0,0,0,0.63) 50%,
                              rgba(0,0,0,1) 100%);
  transition: max-height .2s;
  height: 5px !important;
  opacity: 0.666 !important;
  transition: all 0.3s ease-out 2.7s; 
  overflow: hidden;
  cursor: default;
}
#kusa5:hover .controle-panel {
  height: 46px !important; /* 表示 */
  opacity: 1 !important;
  transition: all 0.3s ease-out; 
}
.controle-panel .btn,
input+label {
  padding: 0;
  color: #fff;
  font-size: 18px;
  border: none;
  background-color: transparent;
}
.controle-panel .r {float: right;}

.controle-panel .progressBar {
  cursor: pointer;
  position: relative;
  height: 14px;
  background-color: #606060;
  width: 100%;
}
.controle-panel .progressBar span {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 100%;
}
.controle-panel .progressBar.seek .mainbar {
  background: #0078E7;
}
.controle-panel .progressBar.seek .bufferbar {
  background: hsla(0, 100%, 100%, 0.33);
}
.controle-panel .progressBar.buf       { height: 2px;}
.controle-panel .progressBar.buf .bar  { background: #1193F3;}
.btn.play {
  /* 再生マークは▲記号を横に90回転させ表現 */
  transform: rotate(90deg);
}
.volume-slider {
  position: relative;
  float: right;
  width: 100px;
  height: 24px;
  margin: 2px 4px;
}

#volume-bar {
  -webkit-appearance: none;
  background: #008ee0;
  border: 0;
  height: 5px;
  width: 0px;
  display: block;
  position: absolute;
  left: 0px;
  top:  10px;
}

.volume-slider input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  padding: 0;
  margin: 0;
  height: 5px;
  width: 100%;
  position: absolute;
  left: 0;
  top: 10px;
}
.volume-slider input[type="range"]:focus {
  outline: none;
}
.volume-slider input[type="range"]::-moz-range-thumb {
  -moz-appearance: none;
  appearance: none;
  border: none;
  background: #0078E7;
  opacity: 1;
  width: 8px;
  height: 16px;
  border-radius: 0;
  cursor: pointer;
  box-sizing: border-box;
}
.volume-slider input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  background: #0078E7;
  opacity: 1;
  width: 8px;
  height: 16px;
  border-radius: 0;
  cursor: pointer;
  -webkit-box-sizing: border-box;
  box-sizing: border-box;
}
button.btn.volume {
  position:relative;
}
.controle-panel .playtime {
  line-height: 30px;
  margin: 0 6px;
}

input.btn {
  display: none;
}
input.btn+label {
  color: #999;
  display: inline-block;
  background-color: hsla(0. 0%, 0%, 0.3);
  text-align: center;
}
input.btn+label:hover,
input.btn:checked+label {
  color: #fff;
  text-decoration-line: underline;
  transform: scale(.98);
}
input.btn+label span{
  font-size:0.5em;
}
div.ratepanel {
  display: inline-block;
  text-align: center;
}


/*
 コメント要素関連
 ******************************************************************************/
#kusa5 .msg {
  z-index: 999;
  display: inline-block;
  word-break: keep-all;
  font-family: "Arial", "sans-serif"; /* 確か元のFlashプレーヤーはArial指定になっていたはず　要するにブラウザ任せ */
  color: white;
  padding: 0 .5em;
  position: absolute;
  transition-duration: 6s;
  transition-timing-function: linear;
  transition-property: transform;
  transform: translate3d(105% ,0,0); /* 画面外に配置するので */
  text-align: center;
  text-shadow: 1px 2px 0px #000;
  top: 0;
} 

/* 非表示状態 */
#kusa5.comment-hidden .msg { opacity: 0;}
button.comment-hidden {
  opacity: 1;
}
#kusa5.comment-hidden button.comment-hidden {
  opacity: .3;
}

/*
 フルスクリーン関連
 ******************************************************************************/
/* 何故か一つづつfont-size指定しないと効かない */
#kusa5:-moz-full-screen .msg {font-size: 4em; }
#kusa5:-webkit-full-screen .msg {font-size: 4em; } 
#kusa5:-webkit-full-screen {
  width: 100%;
  height: 100%;
}
/*
 レスポンシブ
 ******************************************************************************/
#kusa5 {
  width: 640px !important;
  height: 360px !important;
}
#kusa5 .msg {
  font-size: calc(360px / 14);
  height: calc(360px / 14);
  line-height: ` + (360 / 14) + `px;
}
#kusa5 .msg.small {
  font-size: calc(360px / 21);
  height: calc(360px / 21);
  line-height: ` + (360 / 21) + `px;
}
#kusa5 .msg.big {
  font-size: calc(360px / 7);
  height: calc(360px / 7);
  line-height: ` + (360 / 7) + `px;
}
` + generateLines(360, 21) + `

@media screen and (min-width: 820px) {
  #kusa5 {
    width: 800px !important;
    height: 450px !important;
  }
  #kusa5 .msg {
    font-size: calc(450px / 14);
    height: calc(450px / 14);
    line-height: ` + (450 / 14) + `px;
  }
  #kusa5 .msg.small {
    font-size: calc(450px / 21);
    height: calc(450px / 21);
    line-height: ` + (450 / 21) + `px;
  }
  #kusa5 .msg.big {
    font-size: calc(450px / 7);
    height: calc(450px / 7);
    line-height: ` + (450 / 7) + `px;
  }
  ` + generateLines(450, 21) + `
}

@media screen and (min-width: 980px) {
  #kusa5 {
    width: 960px !important;
    height: 540px !important;
  }
  #kusa5 .msg {
    font-size: calc(540px / 14);
    height: calc(540px / 14);
    line-height: ` + (540 / 14) + `px;
  }
  #kusa5 .msg.small {
    font-size: calc(540px / 21);
    height: calc(540px / 21);
    line-height: ` + (540 / 21) + `px;
  }
  #kusa5 .msg.big {
    font-size: calc(540px / 7);
    height: calc(540px / 7);
    line-height: ` + (540 / 7) + `px;
  }
  ` + generateLines(540, 21) + `
}

@media screen and (min-width: 1300px) {
  #kusa5 {
    width: 1280px !important;
    height: 720px !important;
  }
  #kusa5 .msg {
    font-size: calc(720px / 14);
    height: calc(720px / 14);
    line-height: ` + (720 / 14) + `px;
  }
  #kusa5 .msg.small {
    font-size: calc(720px / 21);
  }
  #kusa5 .msg.big {
    font-size: calc(720px / 7);
  }
  ` + generateLines(720, 21) + `
}

#kusa5 video {
  height: 100% !important;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 100% !important;
  min-height: 100% !important;
  max-height: 1200px !important;
}
/*
 左上に縮小表示中
 ******************************************************************************/
body.size_small.no_setting_panel.videoExplorer #kusa5 {
  height: 144px !important;
  width: 300px !important;
  margin: 0;
}
body.size_small.no_setting_panel.videoExplorer #kusa5 .msg{
  font-size: 12px;
}
`);

const $video = $(`<video type="video/mp4"'
      codecs="avc1.42E01E, mp4a.40.2"
      autoplay />`)
  .on('ended', buffShift)
  .on('pause', ev => localStorage.nicoRate = ev.target.playbackRate)
  .on('play',  ev => {
    // レート情報の記憶
    $('input[value="'+ localStorage.nicoRate +'"]').click();
    ev.target.playbackRate = localStorage.nicoRate;
    updateSlider(localStorage.nicoVolume);
    if (!isIframe)
      return;
    // バッファー再生用のプレーヤーは処理を重くしないためにrata1
    ev.target.playbackRate = 1;
    $(ev.target).off().prop('muted', true);
  });

$video.videoToggle = function() {
  var playPauseButton = document.getElementsByClassName('btn toggle play')[0];
  var v = $video[0];  
  if(v.paused === true) {
    v.play();
    playPauseButton.innerHTML = "▲";
  }else {
    v.pause();
    playPauseButton.innerHTML = "〓";
  }
};

$video.click($video.videoToggle);

function addGlobalStyle(css) {
  var styleSeet = $('<style type="text/css">');
  styleSeet.text(css);
  $('head').append(styleSeet);
}

/* 現在のページのDOMから次動画のIDを取得する。
 * なので次の次の動画のIDを取るなら事前にヘッダーを書き換えておく必要がある。*/
function getNextId() {
  // 初回のみカレントID
  const currentID = $('#kusa5 video').data('smid');
  const id = /\W?s(?:m|o)(\d{3,10})\W?/.source; // 現状見受けられる動画は8桁
  const next = "(?:" + ["次","next","つづ","続","最","終"]
      .map(s => s + ".{0,4}")
      .join("|") + ")";
  //const prev = ["前","prev","まえ","ぜん","一","初"];

  // スペースに使われそうな文字(出現しないかもしれない)
  const s = /[\s_|:：]?/.source; 

  const arrows = [  
    " - ",
    "←",
    "→","⇒",
    ":", "：",
    "<","<<","＜＜","≪","«",
    ">",">>","＞＞","≫","»",
    "[<＜≪«][-ー＝=]", // 二文字組み合わせやじるし
    "[-ー＝=][>＞≫»]"];
  const _A_ = s + "(?:" + arrows.join("|") + ")" + s;
  const next_id = next + _A_ + id  ;
  const id_next = id   + _A_ + next;
  //const prev_id = s + prev + _A_ + id   + s;
  //const id_prev = s + id   + _A_ + prev + s;
  const 主米 = $('.description').text();
  //return _.reduce([next_id, id_next], (c,re) => c || 主米.match(re));
  var m = _.reduce([next_id, id_next], (c,re) => {
    return c || 主米.match(new RegExp(re, 'i'));
  },false);
  OPT.debug && alert(!!m && !!m[0] ?
          '次ID切り出し' + m[0]:
          '次パート無し');
  return parseInt(m && m[1] || -1);

}

const FullScreen = {};
FullScreen.isOpen = () =>
  document.mozFullScreen || document.webkitIsFullScreen ||
  (document.fullScreenElement && document.fullScreenElement !== null);
FullScreen.req = (e) =>
  !!e.mozRequestFullScreen && e.mozRequestFullScreen() ||
  !!e.requestFullScreen && e.requestFullScreen() ||
  !!e.webkitRequestFullScreen && e.webkitRequestFullScreen();
FullScreen.cancel = () =>
  !!document.mozCancelFullScreen && document.mozCancelFullScreen() ||
  !!document.cancelFullScreen && document.cancelFullScreen() ||
  !!document.webkitCancelFullScreen && document.webkitCancelFullScreen();
FullScreen.toggle = () =>
  FullScreen.isOpen() ?
    FullScreen.cancel() :
    FullScreen.req($('#kusa5')[0]);

/**
 * ページの遷移処理。実際にはコンテンツを入れ替えるだけで
 * フロントのページは遷移させない
 */
function buffShift() {
  $('.progressBar.buf .bar').css('width', '0%');
  var $nextPage = $('#buf-video').contents().find('body');
  // ビデオソース書き換え
  var $buf = $nextPage.find('#kusa5 video');
  if (!OPT.useBuffer || $buf.size() == 0) {
    FullScreen.cancel();
    return;
  }

  // 上部のコメントとかタイトル書き換え
  $('.videoHeaderTitle').text($nextPage.find('.videoHeaderTitle').text());
  $('#topVideoInfo').remove();
  $('#videoDetailInformation').append($nextPage.find('#topVideoInfo'));

  const nextid = $buf[0].dataset.smid;
  const nobuffer = nextid <= $video.data('smid');
  $video.attr('src',  $buf.attr('src'));
  $video.get(0).dataset.smid = nextid;

  loadApiInfo(nextid).then(loadMsg); // メッセージ取得 && 整形登録
  history.pushState(null,null, WATCH + nextid); // url書き換え

  if (nobuffer) {
    $('#buf-video').remove();
    FullScreen.cancel();
  } else {
    setTimeout(()=>createBuf(getNextId()), 10000);
  }
}

function createBuf(id) {
  $('#buf-video').remove();
console.log('next-id', id);
  if (!id || id < 0)
    return;
  $('#kusa5').append(`<iframe id="buf-video" src="${WATCH + id}"
          width="10px" height="10px" />`);
  // 次ページの動画読み込み進捗を取得
  setTimeout(() => {
    const v = $('#buf-video').contents().find('#kusa5 video')[0];
    const p = $('.progressBar.buf .bar');
    $(v).off('timeupdate').on('timeupdate', _.throttle(ev => {
      var w = 100 * v.currentTime / v.duration;
      p.css('width', w+'%');
    }, 10000));
  }, 20000);
}

function ngfilter(ch) {
  if (ch.t < 100) // 1秒以内。いわゆる0秒コメ
    return false;
  // NGワード
  return _.reduce([
      /[韓荒\[\]]/,
      /(くない|くせえ|アンチ|びみょ|チョン)/,
      /(イライラ|いらいら)/,
      /(キモ|きも|パク|ぱく|エミュ|ウザ|うざ)/,
      /(うぜ|ウゼ)[えぇエェ]/,
      /(推奨|注意|NG|ＮＧ|自演)/,
      /(朝鮮|創価|在日)/,
      /(イラ|いら)[イいつ]?/,
      /(嫌|いや|イヤ)なら/,
      /(ゆとり|信者|名人様|赤字|水色|餓鬼)/,
      /(萎え|挙手)/,
      /(つま|ツマ)[ラら]?[なねんナネン]/,
      /(eco|ｅｃｏ|エコノミ|画質|時報|3DS|倍速)/,
      /^[ノﾉ]$/,
      /^[\/／@＠※←↑↓]/,
    ], (cary, re) => cary && !ch.c.match(re), true);
}

function xml2chats(xml) {
  return _.chain($(xml).find('chat'))
    .map(ch => 
      ({ t: $(ch).attr('vpos') -0, //cast
        c: $(ch).text(),
        m: $(ch).attr('mail') || '' })) // コマンド
    .filter(ngfilter)
    .sortBy(c => c.t);
}

function loadMsg(info) {
  return $.ajax({
    type: 'POST',
    url: info.ms,
    // サーバーによってCORSで弾かれたりバッドリクエスト判定されたり
    // するので application/xmlでもなくtext/xmlでもなく
    // この値に落ち着いた
    contentType: "text/plain",
    dataType: 'xml',
    data: `<packet><thread thread="${info.thread_id}"
      version="20061206" res_from="-5000" scores="1"/>
      </packet>`,
    crossDomain: true,
    cache: false,
  }).then(xml2chats,
    data => console.log('メッセージロード失敗', data)
  ).done(chats => {
    // 時間イベントの発火で、対象メッセージがあれば流す
    var lastT = 0;
    // 次の動画への繊維などで複数回登録させるのでoff()
    $video.off('timeupdate').on('timeupdate', _.throttle(ev => {
      // chat.vpos is 1/100 sec.
      var v = ev.target;
      var t = Math.round(v.currentTime * 100);
      chats.filter(ch => lastT < ch.t && ch.t < t)
        .forEach(_.throttle(marqueeMsg, 250));
      lastT = t;//更新

      // ついでに動画の進捗バーを更新
      var w = 100 * v.currentTime / v.duration; //in %
      $('.progressBar.seek .mainbar').css('width', w+'%');
      $('.controle-panel .current')
        .text(UTIL.sec2HHMMSS(v.currentTime));
      $('.controle-panel .duration')
        .text(UTIL.sec2HHMMSS(v.duration));
    }, 1000));
    $video.off('progress').on('progress', _.throttle(ev => {
      var v = ev.target;
      if  (v.buffered.length == 0)
        return;
      var bufTime = v.buffered.end(v.buffered.length-1);
      var bw = 100 * bufTime / v.duration;
      $('.progressBar.seek .bufferbar').css('width', bw+'%');
    }, 1000));
  });
}

/** 動画URLなどの情報を取得してPromiseを返す。
 * キャリーされる値はクエリストリングをオブジェクトにした奴
 */
function loadApiInfo(id) {
  return $.ajax({
    'type': 'GET',
    'url': ASKURL + id,
    'crossDomain': true,
    'cache': false,
    'xhrFields': {'withCredentials': true} // Cookie認証が必要
  }).then(qs => _.reduce(qs.split('&'), (o, k_v)=>{
    var a = _.map(k_v.split('='), decodeURIComponent);
    o[a[0]] = a[1];
    return o; // クエリストリングをオブジェクトにした奴
  },{}));
}

const colortable = {
  white:   '#FFFFFF',
  red:     '#FF0000',
  pink:    '#FF8080',
  orange:  '#FFC000',
  yellow:  '#FFFF00',
  green:   '#00FF00',
  cyan:    '#00FFFF',
  blue:    '#0000FF',
  purple:  '#C000FF',
  black:   '#000000',
  white2:  '#CCCC99',
  niconicowhite: '#CCCC99',
  red2:    '#CC0033',
  truered: '#CC0033',
  pink2:   '#FF33CC',
  orange2: '#FF6600',
  passionorange: '#FF6600',
  yellow2: '#999900',
  madyellow: '#999900',
  green2:  '#00CC66',
  elementalgreen: '#00CC66',
  cyan2:   '#00CCCC',
  blue2:   '#3399FF',
  marineblue: '#3399FF',
  purple2: '#6633CC',
  nobleviolet: '#6633CC',
  black2:  '#666666',
}

const sizetable = {
  small: 'small',
  medium: 'medium',
  big: 'big',
}

const msgsizetable = {
  small: 1,
  medium: 2,
  big: 3,
}

const msgpostable = {
  ue: 1,
  naka: 2,
  shita: 3,
}

function marqueeMsg(ch) {
  const baseW = $('#kusa5').width() + 10;
  //const hasMsg = $('#kusa5 .msg').size() > 0;
  
  var msgSize = 2;
  
  $m = $('<div class="msg"/>');
  $m.text(ch.c);
  $m.html($m.text().replace(/\n/, '<br>'));
  $m.css('transform', `translate3d(${baseW}px, 0, 0)`);
  _.each(ch.m.split(' '), command => {
    if (command in colortable) {
      $m.css('color', colortable[command]);
    } else if (command[0] === '#') {
      $m.css('color', command);
    }
    if (command in sizetable) {
      msgSize = msgsizetable[command];
      $m.addClass(command);
    }
    if(command === 'invisible') {
      $m.hide();
    }
  });
  $video.after($m);
  
  function hasRightSpace(l) {
    // 一番右端にあるmsgの右端の位置
    var bigwidth = _.max(_.map($('#kusa5').find(l),
        // offsetLeftだと0が返る
        l => $(l).position().left + l.scrollWidth));
    var rigthSpace = baseW - bigwidth;
    // 比率係数は適当。文字が重なるようなら要調整
    // transition速度(つまりアニメーション再生時間)と関係
    return rigthSpace > $m.width() * 0.45;
  }
  
  var line = (() => {
    if(msgSize === 1) {
      for (var i = 1; i <= 21; i+=msgSize) {
        if (hasRightSpace('.l' + i)) {
          switch (msgSize) {
            case 1:
              return i;
            case 2:
              if (hasRightSpace('.l' + i)) return i;
              break;
            case 3:
              if (hasRightSpace('.l' + i) && hasRightSpace('.l' + (i + 1))) return i;
              break;
          }
        }
      }
      return 1;
    } else {
      for (var i = 1; i < 21; i+=msgSize) {
        if (hasRightSpace('.l' + i)) {
          switch (msgSize) {
            case 1:
              return i;
            case 2:
              if (hasRightSpace('.l' + (i + 1))) return i;
              break;
            case 3:
              if (hasRightSpace('.l' + (i + 1)) && hasRightSpace('.l' + (i + 2))) return i;
              break;
          }
        }
      }
      return 1;
    }
  })();
  
  $m.addClass('l' + line);
  //オーバーシュート
  $m.css('transform', `translate3d(-${$m.width() + 10}px, 0, 0)`);
  //アニメ停止で自動削除
  $m.on('transitionend', ev => $(ev.target).remove());
}

var UTIL = {};
UTIL.sec2HHMMSS = function (sec) {
    var sec_num = parseInt(sec, 10); // don't forget the second param
    var hours = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    return (hours > 0? hours+':' :'') + minutes+':'+seconds;
};

function rateForm() {

  //var rd = [1, 1.2, 1.5, 2, 2.2, 2.5, 3]
  var rd = [1, 1.3463246851125779, 1.6678900230322302,
    1.9680012082762555, 2.249342814692259, 2.514125064795459,
    2.764189394992108, 3.001086195676507 ]
    .map(v=>
      `<input name="nicorate" type="radio" id="rd${v}"
        class="btn" value="${v}">
      <label for="rd${v}">${v.toFixed(1)}<span>x</span></label>`);
  return `<div class="ratepanel">${rd.join('')}</div>`;
}

const COMMENT = `
<div class="comment">
  <input type="text" class="l" /><button class="btn l">投稿</button>
</div>`;

const CONTROLE_PANEL = `
<div class="controle-panel">
  <div class="progressBar seek">
    <span class="bufferbar"/>
    <span class="mainbar"/>
  </div>
  <div class="progressBar buf"><span class="bar"/></div>
  <button class="btn toggle play">▲</button>
  ${rateForm()}
  <button class="btn full r">■</button>
  <button class="btn comment-hidden r">💬</button>
  <div class="volume-slider r">
    <input type="range" name="bar"  id="volume-slider" step="1" min="0" max="100" value="0" />
    <span id="volume-bar"></span>
  </div>
  <button class="btn repeat r">➡️</button>
  <div class="playtime r">
    <span class="current"></span>
    /
    <span class="duration"></span>
  </div>
</div>`;

function ctrPanel() {
  var $panel = $(CONTROLE_PANEL);
  $panel.find('.btn.full').click(FullScreen.toggle);
  $panel.find('.btn.toggle').click($video.videoToggle);
  return $panel;
}

function updateSlider(volume) {
  var slider = $('#volume-slider')[0];
  var bar = $('#volume-bar')[0];
  const range = slider.clientWidth;
  const max = slider.max;
  slider.value = volume;
  bar.style.width = ((range / max) * volume) +'px';
  $video[0].volume = volume * 0.01;
}

//update Progress Bar control
var updatebar = function(e) {
  var bar = $('.progressBar.seek');
  var offset = e.pageX - bar.offset().left; //Click pos
  var ratio = Math.min(1, Math.max(0, offset / bar.width()));
  //Update bar and video currenttime
  $('.progressBar.seek .mainbar').css('width', (ratio * 100)+'%');
  $video[0].currentTime = $video[0].duration * ratio;
  return true;
}

function updateRepeat(oninit) {
  if(oninit) {
    var state = localStorage.getItem('repeat');
    if(state !== null)
      $video.get(0).loop = state;
  } else {
    $video.get(0).loop = !$video.get(0).loop;
    localStorage.repeat = $video.get(0).loop;
  }
  if($video.get(0).loop)
    $('button.repeat').html(`🔁`);
  else
    $('button.repeat').html(`➡️`);
}

// 対応外（ニコニコムービーメーカーとか）のURLを弾く
function getMovieInfo() {
  var uri = location.href;
  var uriArray = uri.split('/');
  var movieId = "";
  if (uri.endsWith('/'))
    movieId = uriArray[uriArray.length - 2];
  else
    movieId = uriArray[uriArray.length - 1];
  
  // http://ext.nicovideo.jp/api/getthumbinfo/ がCORSで殺されるのクソすぎじゃないですか
  return $.ajax({
    type: 'GET',
    url: 'http://crossorigin.me/' + INFO + movieId, // crossorigin.meが遅い…　ghippos.netでCORS proxyを立てるまである
    crossDomain: true,
    cache: false,
    dataType: 'xml',
  });
}

/** main というかエントリーポイント */
;(function () {
  getMovieInfo().then(xml => {
    var isMP4 = false;
    $(xml).find('movie_type').each(function (type) {
      isMP4 = ($(this).text() === 'mp4');
    });
    return isMP4;
  })
  .then(isMP4 => {
    if (!isMP4) {
      $('.videoDetailExpand').append('<p style="color: #333;font-size: 185%;z-index: 2;line-height: 1.2;display: table-cell;vertical-align: middle;word-break: break-all;word-wrap: break-word;max-width: 672px;margin-right: 10px;">（kusa5.mod.user.js 非対応)</p>')
      return;
    } else {
      $('.notify_update_flash_player').hide();
      $('.playerContainer').hide();
      if(OPT.hidePlaylist)
        $('#playlist').hide();
      $('#playerContainerSlideArea').attr('id', 'kusa5');
      if(OPT.showPageTop)
        $('#playerContainerWrapper').insertBefore('.videoHeaderOuter'); // お好み
      if(!OPT.autoPlay) {
        $video.removeAttr('autoplay');
        $video.get(0).load();
      }
        
      const kusa5 = $('#kusa5')
        .append($video)
        .append(ctrPanel());

      updateRepeat(true);

      $('input[name=nicorate]').change(ev => {
        localStorage.nicoRate =
        $video.get(0).playbackRate = parseFloat($(ev.target).val());
      });
      $('input[value="'+ localStorage.nicoRate +'"]').click();

      $('#volume-slider').on('input', ev => {
        localStorage.nicoVolume = ev.target.value;
        updateSlider(localStorage.nicoVolume);
      });

      $('#kusa5 button.comment-hidden').click(ev => kusa5.toggleClass('comment-hidden'));
      $('#kusa5 button.repeat').click(() => updateRepeat(false));

      var promise = loadApiInfo(launchID).then(info => {
        $video.attr('src', info.url);
        $video.get(0).dataset.smid = launchID;
        return info;
      });

      if (isIframe)
        return; // 以降はフォワードページのみの処理

      var attachSeekEvent = function() {
        var timeDrag = false;  /* Drag status */
        $('.progressBar.seek').mousedown(function(e) {
          timeDrag = true;
          updatebar(e);
        });
        $('.progressBar').mouseup(function(e) {
          if(!timeDrag)
            return;
          timeDrag = false;
          updatebar(e.pageX);
        }).mousemove(e=> timeDrag && updatebar(e));
      };
      
      // プレミアム会員かどうか
      var isPremium = false;
      if($('#siteHeaderNotificationPremium').is(':hidden')){
        isPremium = true;
      }
      else{
        if(!OPT.noLimit){
          // ニコニコ側のJSの反映が遅いときにうまく判定できないため
          var mo = new MutationObserver(function(){
            if($('#siteHeaderNotificationPremium').is(':hidden')){
              attachSeekEvent();
            }
          });
          var siteHeaderNotification = document.getElementById("siteHeaderNotification")
          var options = {childList: true, subtree: true};
          mo.observe(siteHeaderNotification, options);
        }
      }
      
      if (isPremium || OPT.noLimit) {
        attachSeekEvent();
      }
      
      // ボタン押された時の動作登録
      var keyTbl = [];
      keyTbl[32] = $video.videoToggle; //スペースキー
      kusa5.keyup(e => {
        if (!keyTbl[e.keyCode])
          return;
        keyTbl[e.keyCode]();
        e.preventDefault();	
      });
      kusa5.keydown(e => {
        //ボタンの処理が登録されてたらブラウザの動作をうちけす
        if (keyTbl[e.keyCode])
          e.preventDefault();
      });
      
      //メッセージ取得、文字流しとかのループイベント登録
      promise.then(loadMsg);
      
      if ((isPremium || OPT.noLimit) && OPT.useBuffer) // バッファ用のiFrameを作成する
        setTimeout(() => createBuf(getNextId()), 10000);
    }
  });
})();