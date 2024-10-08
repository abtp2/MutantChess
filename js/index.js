//custom scripts
function $(selector){
const elements = document.querySelectorAll(selector);
var x;
if(elements.length == 1){x = elements[0]}
else{x = elements}
return x;
}
function goTo(x){window.location = x;}
window.addEventListener("load",function(){
if(localStorage.getItem("sb-bsblowjukqjtsnbzqqxs-auth-token")){
$("nav span:nth-of-type(2) button").forEach((btn)=>{btn.style.display ="none"});
$("nav span:nth-of-type(2) img").style.display ="block";
}else{
$("nav span:nth-of-type(2) button").forEach((btn)=>{btn.style.display ="block"});
$("nav span:nth-of-type(2) img").style.display ="none";
}
$("#loader").style.display ="none";
});

const game = new window.Chess();
const board = window.Chessboard2('chessBoard', {
draggable: false,
position: 'start'
});
var statusHTML = ['The AIs are still battling!', 'Hope you’re watching.', 'Wait for the outcome.', 'OR start your own game instead.'];
updateStatus();
function setCloud(x){
statusHTML = [x,"Refresh, to see AI battle."];
typed.strings = statusHTML;
typed.start();
}

window.setTimeout(makeRandomMove, 800);
function makeRandomMove(){
const possibleMoves = game.moves();
  // Exit if the game is over
  if (game.game_over()) return;
  const randomIdx = Math.floor(Math.random() * possibleMoves.length);
  game.move(possibleMoves[randomIdx]);
  board.position(game.fen(), updateStatus);
  window.setTimeout(makeRandomMove, 500);
}

function updateStatus(){
  if (game.in_checkmate() && game.turn() === 'w') {
    setCloud('Checkmate, Black wins!');
  } else if (game.in_checkmate() && game.turn() === 'b') {
    setCloud('Checkmate, White wins!');
  } else if (game.in_stalemate() && game.turn() === 'w') {
    setCloud('Drawn, White is stalemated.');
  } else if (game.in_stalemate() && game.turn() === 'b') {
    setCloud('Drawn, Black is stalemated.');
  } else if (game.in_threefold_repetition()) {
    setCloud('Drawn, by threefold repetition rule.');
  } else if (game.insufficient_material()) {
    setCloud('Drawn, not enough material.');
  } else if (game.in_draw()) {
    setCloud('Drawn, fifty-move rule.');
  }
}


/* typing */
var typed = new Typed('.cloud',{
strings: statusHTML,
typeSpeed: 100,
backSpeed: 100,
loop: true,
});


// Menu
$("nav span:nth-of-type(1) #menuBtn").addEventListener("click", (event) => {
const div = $("nav span:nth-of-type(1)");
div.classList.toggle("menu-open");
});
document.addEventListener("click",function(event){
const menu = $("nav span:nth-of-type(1)");
if(!menu.querySelector("#menuBtn").contains(event.target)){
setTimeout(()=>{menu.classList.remove("menu-open")},100);
}});


