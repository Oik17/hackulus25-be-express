import Joi from "joi";

/*
 assign teams to panels based on track
 track with most teams always assigned to panel 4 coz just 1 team
 assigned in fcfs
*/
export function assignPanelsToTeams(panels, teams) {
    // joi schemas
    const panelSchema = Joi.object({
        panel_id: Joi.number().required()
    });

    const teamSchema = Joi.object({
        team_id: Joi.number().required(),
        track_id: Joi.number().required()
    });

    const panelsSchema = Joi.array().items(panelSchema).length(4).required();
    const teamsSchema = Joi.array().items(teamSchema).required();

    // Validate
    const { error: panelsError } = panelsSchema.validate(panels);
    if (panelsError) throw new Error(`Invalid panels input: ${panelsError.message}`);

    const { error: teamsError } = teamsSchema.validate(teams);
    if (teamsError) throw new Error(`Invalid teams input: ${teamsError.message}`);

    // panel ids
    const pIds = panels.map(p => p.panel_id);
    const p1 = pIds[0], p2 = pIds[1], p3 = pIds[2], p4 = pIds[3];

    if (teams.length === 0) return [];

    // count teams per track and record first occurrence index
    const trackCounts = {};
    const firstIdx = {};
    for (let i = 0; i < teams.length; i++) {
        const t = teams[i].track_id;
        trackCounts[t] = (trackCounts[t] || 0) + 1;
        if (firstIdx[t] === undefined) firstIdx[t] = i;
    }

    // find track with most teams (if tie, same as earlier)
    let maxTrack = null;
    let maxCount = -1;
    for (const [tk, cnt] of Object.entries(trackCounts)) {
        const trackNum = Number(tk);
        if (cnt > maxCount || (cnt === maxCount && firstIdx[trackNum] < firstIdx[maxTrack])) {
            maxCount = cnt;
            maxTrack = trackNum;
        }
    }

    // unique remaining tracks excluding the maxTrack
    const remainingTracks = Object.keys(trackCounts)
        .map(k => Number(k))
        .filter(t => t !== maxTrack);

    // sort remaining by count desc, if tie, same as earlier
    remainingTracks.sort((a, b) => {
        if (trackCounts[b] !== trackCounts[a]) return trackCounts[b] - trackCounts[a];
        return (firstIdx[a] || 0) - (firstIdx[b] || 0);
    });

    // assign two tracks each to panels 1-3 in order
    const trackToPanel = {};
    trackToPanel[maxTrack] = p4;

    const groups = [
        { panel: p1, slots: 2 },
        { panel: p2, slots: 2 },
        { panel: p3, slots: 2 }
    ];

    let idx = 0;
    for (const g of groups) {
        for (let s = 0; s < g.slots && idx < remainingTracks.length; s++, idx++) {
            trackToPanel[remainingTracks[idx]] = g.panel;
        }
    }

    // if leftover tracks (more than 6), distribute round-robin across panels 1-3
    const rrPanels = [p1, p2, p3];
    let rr = 0;
    while (idx < remainingTracks.length) {
        const t = remainingTracks[idx++];
        trackToPanel[t] = rrPanels[rr % rrPanels.length];
        rr++;
    }

    // map teams to panels fcfs
    const assignments = teams.map(team => {
        const mapped = trackToPanel[team.track_id];
        if (mapped === undefined) throw new Error(`No panel mapping for track ${team.track_id}`);
        return { team_id: team.team_id, panel_id: mapped };
    });

    return assignments;
}
