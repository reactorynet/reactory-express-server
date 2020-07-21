

export const ttcBadge = (ttc: number) => {
  let ttcBadge = '🎖'
  if(ttc < 2000) {
    ttcBadge = '🥉'
  }

  if(ttc < 1000) {
    ttcBadge = '🥈'
  }

  if(ttc < 500) {
    ttcBadge = '🥇'
  }

  if(ttc < 200) {
    ttcBadge = '🏆'
  }

  if(ttc < 150) {
    ttcBadge = '🏆🏆'
  }

  return ttcBadge;
}


