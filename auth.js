window.currentUser = null;

window.register = function(){
  const u = user.value;
  const p = pass.value;
  if(!u || !p) return msg.textContent="Fill all";

  if(localStorage.getItem("user_"+u))
    return msg.textContent="User exists";

  localStorage.setItem("user_"+u, JSON.stringify({
    password:p,
    world:null
  }));

  msg.textContent="Registered!";
}

window.login = function(){
  const u = user.value;
  const p = pass.value;
  const data = localStorage.getItem("user_"+u);
  if(!data) return msg.textContent="No user";

  const obj = JSON.parse(data);
  if(obj.password!==p) return msg.textContent="Wrong password";

  window.currentUser = u;
  document.getElementById("login").style.display="none";
  document.getElementById("gameUI").style.display="block";
  window.startGame(obj.world);
}
