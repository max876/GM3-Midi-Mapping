-- Config
local fader_table = { 
	201, 202, 203, 204, 205, 206, 207, 208, 209, 210 
}
local exec_table = { 
	101, 102, 103, 104, 105, 106, 107, 108, 109, 110,
	201, 202, 203, 204, 205, 206, 207, 208, 209, 210,
	301, 302, 303, 304, 305, 306, 307, 308, 309, 310,
	401, 402, 403, 404, 405, 406, 407, 408, 409, 410
}
local osc_config = 2



-- Exec var
local enable = false
local last_values, last_status = {}, {}
local osc_exec = 'SendOSC %i "/Exec,iiiii,%i,%i,%i,%i,%i"'
local osc_fader = 'SendOSC %i "/Fader,ii,%i,%i"'


local function send_Fader(template, type, exec_id, value)
	Cmd(osc_fader:format(osc_config, 'Fader', exec_id, value))
end

local function send_Exec(exec_id, state, r, g, b)
    Cmd(osc_exec:format(osc_config, exec_id, state, r, g, b))
end

local function exec_runtime(exec_id)
	local exec = GetExecutor(exec_id)
	local status = 0 
    local r = 0
    local g = 0
    local b = 0
    -- Status : 0 = Unlinked, 1 = Linked, 2 = Active
    
	if exec and exec.Object ~= nil then 
        status = 1
		
		if exec.Object.Appearance ~= nil then
        	r = exec.Object.Appearance.backr
       	    g = exec.Object.Appearance.backg
       	    b = exec.Object.Appearance.backb
        end
        
		if exec.Object:HasActivePlayback() then status = 2 end
	end
	
	if status ~= last_status[exec_id] then
		send_Exec(exec_id, status, r, g, b)
		last_status[exec_id] = status
	end
end

local function fader_runtime(fader_id)
	local value = GetFader(fader_id) or 0
	
	if value ~= last_values then 
		send_OSC("Fader", exec_id, value)
		last_values[exec_id] = value
	end
end


local function mainloop()
	while enable do
		for _, exec_id in ipairs(exec_table) do exec_runtime(exec_id) end
		--for _, fader_id in ipairs(fader_table) do fader_runtime(fader_id) end
		coroutine.yield(0.01)
	end
end

local function maintoggle()
	enable = not enable
	if enable then 
		last_values, last_status = {}, {}
		mainloop()
	end
end 

return maintoggle