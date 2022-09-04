'use strict'

const ITEMS_NOSTRUM = [150942], // Tempestuous Savage Draught 
	BUFF_NOSTRUM = [1251], // Tempestuous Savage Draught abnormalities
	BUFF_INVINCIBILITY = [1251] 

module.exports = function Savage(mod) {

	mod.game.initialize(['me', 'me.abnormalities', 'contract']);

	let player = null,
		dest = null,
		item = null,
		interval = null,
		enabled = true,
		counter = 0,
		resetcount = null

	// ############# //
	// ### Hooks ### //
	// ############# //

    mod.hook("C_PLAYER_LOCATION", 5, event => { 
        player = event;
        dest = event;
    });

	mod.game.on('enter_game', () => { setTimeout(start, 6000) })
	mod.game.on('leave_game', () => { stop() })

	mod.game.me.on('resurrect', () => { start() })
    
    mod.hook("S_ABNORMALITY_BEGIN", 4, () => {
        if (mod.game.me.abnormalities ["77700800"] ) {
            mod.send('C_PLAYER_LOCATION', 5,            
            {
            "loc": player.loc,
            "w": player.w,
            "dest":  player.loc,
            "type" : 5
            })
        }
    });

	mod.hook('S_PREMIUM_SLOT_DATALIST', 2, event => {
		for(let set of event.sets)
			for(let entry of set.inventory)
				if(ITEMS_NOSTRUM.includes(entry.id)) {
					item = {
						set: set.id,
						slot: entry.slot,
						type: entry.type,
						id: entry.id
					}
					entry.cooldown = 0n // Cooldowns from this packet don't seem to do anything except freeze your client briefly
					return true
				}
	})

	if(mod.settings.log) {
		mod.hook('C_USE_ITEM', 3, event => {
			mod.command.message('Used item ID: ' + event.id)
		})
	}

	// ################# //
	// ### Functions ### //
	// ################# //

    function abnormalityDuration(id) {
        const abnormality = mod.game.me.abnormalities[id]
        return abnormality ? abnormality.remaining : 0
    }

	function checkItems() {
		for(let buff of BUFF_INVINCIBILITY) 
			if(abnormalityDuration(buff) > 0) return

		useNostrum()
	}

	function useNostrum() {
		for(let buff of BUFF_NOSTRUM)
			if(abnormalityDuration(buff) > mod.settings.nostrumTime * 60000 || !mod.settings.useNostrum) return

		if(!mod.game.isIngame || mod.game.isInLoadingScreen || !mod.game.me.alive || mod.game.me.mounted || mod.game.me.inBattleground || mod.game.contract.active) return
		if(!mod.game.me.inDungeon && mod.settings.dungeonOnly) return

		if(enabled) {
			if(item) mod.send('C_USE_PREMIUM_SLOT', 1, item)
			else useItem(mod.settings.nostrum)
		}
	}

	function useItem(item) {
		counter++
		if(counter > 5) {
			let missing = (item == mod.settings.nostrum) ? 'Nostrums' :
			enabled = false
			return
		}
		if(!resetcount) resetcount = setTimeout(() => { counter = 0; resetcount = null }, 15000)
		mod.toServer('C_USE_ITEM', 3, {
			gameId: mod.game.me.gameId,
			id: item,
			dbid: 0,
			target: 0,
			amount: 1,
			dest: {x: 0, y: 0, z: 0},
			loc: {x: 0, y: 0, z: 0},
			w: 0, 
			unk1: 0,
			unk2: 0,
			unk3: 0,
			unk4: 1
		})
	}
	
	function start() {
		stop()
		interval = setInterval(checkItems, 1500)
	}

	function stop() {
		if (interval) {
			clearInterval(interval)
			interval = null
		}
	}

	// ################ //
	// ### Commands ### //
	// ################ //

	mod.command.add(['Savage', 'ses'], (cmd) => {
		if(cmd == null) {
			enabled = !enabled
			mod.command.message('Savage Draught' + (enabled ? '<font color="#56B4E9">enabled</font>' : '<font color="#E69F00">disabled</font>'))
			console.log('Savage Draught' + (enabled ? 'enabled' : 'disabled'))
		}
		else if(cmd == "dungeon" || cmd == "dungeons" || cmd == "dung") {
			mod.settings.dungeonOnly = !mod.settings.dungeonOnly
			mod.command.message('Items will be used ' + (mod.settings.dungeonOnly ? 'everywhere' : 'in dungeons only'))
		}
		else mod.command.message('Commands:\n'
			+ ' "ses" (enable/disable Savage),\n'
			+ ' "ses dungeon" (switch between using items everywhere or only in dungeons)'
		)
	})
}