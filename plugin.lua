-- Config
local fader_table = { 
	201, 202, 203, 204, 205, 206, 207, 208, 209, 210 
}
local osc_config = 2



-- Exec var
local enable = false
local last_values, last_status = {}, {}
local osc_exec = 'SendOSC %i "/Exec,iiiii,%i,%i,%i,%i,%i"'
local osc_fader = 'SendOSC %i "/Fader,ii,%i,%i"'



local function send_Exec(exec_id, state, r, g, b)
    Cmd(osc_exec:format(osc_config, exec_id, state, r, g, b))
end
local function send_Fader(fader_id, value)
	Cmd(osc_fader:format(osc_config, fader_id, value))
end

local function exec_runtime(exec_id)
	local exec = GetExecutor(exec_id)
	local status = 0 
	local width = 1
	local height = 1
    local r = 0
    local g = 0
    local b = 0
    -- Status : 0 = Unlinked, 1 = Linked, 2 = Active
    
	if exec and exec.Object ~= nil then 
        status = 1
        width = exec.Width
        height = exec.Height
		
		if exec.Object.Appearance ~= nil then
        	r = exec.Object.Appearance.backr
       	 g = exec.Object.Appearance.backg
       	 b = exec.Object.Appearance.backb
       end
        
		if exec.Object:HasActivePlayback() then status = 2 end
	end
	
	if status ~= last_status[exec_id] then
		for x = 1, width do
			for y = 1, height do
				local exec_off = exec_id + (x - 1) + (y - 1) * 100
				send_Exec(exec_off, status, r, g, b)
				last_status[exec_off] = 0
			end
		end
		
		last_status[exec_id] = status
	end
end

local function fader_runtime(fader_id)
	local exec = GetExecutor(fader_id)
	local value = 0
	if exec ~= nil then 
		value = GetFader(exec) or 0
	end
	
	if value ~= last_values then 
		send_Fader(fader_id, value)
		last_values[fader_id] = value
	end
end


local function mainloop()
	while enable do
		for i = 1, 85 do exec_runtime(100 + i) exec_runtime(200 + i) exec_runtime(300 + i) exec_runtime(400 + i) end
		--for i = 1, 85 do fader_runtime(200 + i) end
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