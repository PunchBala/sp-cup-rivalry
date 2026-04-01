    const SEASON = 2026;
    const SERIES_TAG = 'IPL 2026';

    // ========= USER-EDITABLE PREDICTIONS =========
    const MATCHUPS = [
      {
        id: 'senthil-sai',
        label: 'Senthil vs Sai',
        a: {
          name: 'Senthil',
          picks: {
            titleWinner: 'MI',
            orangeCap: 'KL Rahul',
            mostSixes: 'Vaibhav Suryavanshi',
            purpleCap: 'Yuzvendra Chahal',
            mostDots: 'Prasidh Krishna',
            mvp: 'KL Rahul',
            uncappedMvp: 'Auqib Nabi',
            fairPlay: 'PBKS',
            highestScoreTeam: 'PBKS',
            striker: 'Dewald Brevis',
            bestBowlingFigures: 'Akeal Hosein',
            bestBowlingStrikeRate: 'Josh Hazlewood',
            mostCatches: 'Dewald Brevis',
            tableBottom: 'KKR',
            leastMvp: 'MS Dhoni'
          }
        },
        b: {
          name: 'Sai',
          picks: {
            titleWinner: 'RCB',
            orangeCap: 'Shubman Gill',
            mostSixes: 'Nicholas Pooran',
            purpleCap: 'Rashid Khan',
            mostDots: 'Trent Boult',
            mvp: 'Shreyas Iyer',
            uncappedMvp: 'Prashant Veer',
            fairPlay: 'GT',
            highestScoreTeam: 'LSG',
            striker: 'Phil Salt',
            bestBowlingFigures: 'Harshal Patel',
            bestBowlingStrikeRate: 'Rashid Khan',
            mostCatches: 'Virat Kohli',
            tableBottom: 'SRH',
            leastMvp: 'Cameron Green'
          }
        }
      },
      {
        id: 'senthil-vibeesh',
        label: 'Senthil vs Vibeesh',
        a: {
          name: 'Senthil',
          picks: {
            titleWinner: 'RCB',
            orangeCap: 'Shubman Gill',
            mostSixes: 'Sanju Samson',
            purpleCap: 'Arshdeep Singh',
            mostDots: 'Jasprit Bumrah',
            mvp: 'Abhishek Sharma',
            uncappedMvp: 'Vaibhav Suryavanshi',
            fairPlay: 'CSK',
            highestScoreTeam: 'LSG',
            striker: 'Ishan Kishan',
            bestBowlingFigures: 'Yuzvendra Chahal',
            bestBowlingStrikeRate: 'Harshal Patel',
            mostCatches: 'Tilak Varma',
            tableBottom: 'RR',
            leastMvp: 'Rajat Patidar'
          }
        },
        b: {
          name: 'Vibeesh',
          picks: {
            titleWinner: 'PBKS',
            orangeCap: 'Shreyas Iyer',
            mostSixes: 'Abhishek Sharma',
            purpleCap: 'Yuzvendra Chahal',
            mostDots: 'Khaleel Ahmed',
            mvp: 'Virat Kohli',
            uncappedMvp: 'Prabhsimran Singh',
            fairPlay: 'DC',
            highestScoreTeam: 'MI',
            striker: 'Finn Allen',
            bestBowlingFigures: 'Varun Chakravarthy',
            bestBowlingStrikeRate: 'Jasprit Bumrah',
            mostCatches: 'Rinku Singh',
            tableBottom: 'CSK',
            leastMvp: 'Rishabh Pant'
          }
        }
      }
    ];

    // ========= CATEGORY MAP =========
    const CATEGORIES = [
      { key:'titleWinner', label:'Title winner', type:'title' },
      { key:'orangeCap', label:'Orange cap', type:'top5' },
      { key:'mostSixes', label:'Most sixes', type:'top5' },
      { key:'purpleCap', label:'Purple cap', type:'top5' },
      { key:'mostDots', label:'Most dot balls', type:'top5' },
      { key:'mvp', label:'MVP', type:'top5' },
      { key:'uncappedMvp', label:'Uncapped MVP', type:'winner_better' },
      { key:'fairPlay', label:'Fair Play award', type:'winner_better' },
      { key:'highestScoreTeam', label:'Highest team score', type:'winner_better' },
      { key:'striker', label:'Striker of the season', type:'better_rank' },
      { key:'bestBowlingFigures', label:'Best bowling figures', type:'better_rank' },
      { key:'bestBowlingStrikeRate', label:'Best bowling strike rate', type:'better_rank' },
      { key:'mostCatches', label:'Most catches', type:'better_rank' },
      { key:'tableBottom', label:'Bottom of table', type:'winner_better' },
      { key:'leastMvp', label:'Least MVP', type:'better_rank_low' }
    ];

    // ========= LEAGUE-STAGE SCHEDULE (UTC) =========
    const LEAGUE_STAGE_SCHEDULE_FALLBACK = [
      {
            "match_no": 1,
            "home_team": "Royal Challengers Bengaluru",
            "away_team": "Sunrisers Hyderabad",
            "venue": "Bengaluru",
            "fixture": "Sunrisers Hyderabad @ Royal Challengers Bengaluru",
            "date_utc": "2026-03-28",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-03-28T14:00:00Z"
      },
      {
            "match_no": 2,
            "home_team": "Mumbai Indians",
            "away_team": "Kolkata Knight Riders",
            "venue": "Mumbai",
            "fixture": "Kolkata Knight Riders @ Mumbai Indians",
            "date_utc": "2026-03-29",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-03-29T14:00:00Z"
      },
      {
            "match_no": 3,
            "home_team": "Rajasthan Royals",
            "away_team": "Chennai Super Kings",
            "venue": "Guwahati",
            "fixture": "Chennai Super Kings @ Rajasthan Royals",
            "date_utc": "2026-03-30",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-03-30T14:00:00Z"
      },
      {
            "match_no": 4,
            "home_team": "Punjab Kings",
            "away_team": "Gujarat Titans",
            "venue": "New Chandigarh",
            "fixture": "Gujarat Titans @ Punjab Kings",
            "date_utc": "2026-03-31",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-03-31T14:00:00Z"
      },
      {
            "match_no": 5,
            "home_team": "Lucknow Super Giants",
            "away_team": "Delhi Capitals",
            "venue": "Lucknow",
            "fixture": "Delhi Capitals @ Lucknow Super Giants",
            "date_utc": "2026-04-01",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-04-01T14:00:00Z"
      },
      {
            "match_no": 6,
            "home_team": "Kolkata Knight Riders",
            "away_team": "Sunrisers Hyderabad",
            "venue": "Kolkata",
            "fixture": "Sunrisers Hyderabad @ Kolkata Knight Riders",
            "date_utc": "2026-04-02",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-04-02T14:00:00Z"
      },
      {
            "match_no": 7,
            "home_team": "Chennai Super Kings",
            "away_team": "Punjab Kings",
            "venue": "Chennai",
            "fixture": "Punjab Kings @ Chennai Super Kings",
            "date_utc": "2026-04-03",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-04-03T14:00:00Z"
      },
      {
            "match_no": 8,
            "home_team": "Delhi Capitals",
            "away_team": "Mumbai Indians",
            "venue": "Delhi",
            "fixture": "Mumbai Indians @ Delhi Capitals",
            "date_utc": "2026-04-04",
            "time_utc": "10:00:00Z",
            "datetime_utc": "2026-04-04T10:00:00Z"
      },
      {
            "match_no": 9,
            "home_team": "Gujarat Titans",
            "away_team": "Rajasthan Royals",
            "venue": "Ahmedabad",
            "fixture": "Rajasthan Royals @ Gujarat Titans",
            "date_utc": "2026-04-04",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-04-04T14:00:00Z"
      },
      {
            "match_no": 10,
            "home_team": "Sunrisers Hyderabad",
            "away_team": "Lucknow Super Giants",
            "venue": "Hyderabad",
            "fixture": "Lucknow Super Giants @ Sunrisers Hyderabad",
            "date_utc": "2026-04-05",
            "time_utc": "10:00:00Z",
            "datetime_utc": "2026-04-05T10:00:00Z"
      },
      {
            "match_no": 11,
            "home_team": "Royal Challengers Bengaluru",
            "away_team": "Chennai Super Kings",
            "venue": "Bengaluru",
            "fixture": "Chennai Super Kings @ Royal Challengers Bengaluru",
            "date_utc": "2026-04-05",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-04-05T14:00:00Z"
      },
      {
            "match_no": 12,
            "home_team": "Kolkata Knight Riders",
            "away_team": "Punjab Kings",
            "venue": "Kolkata",
            "fixture": "Punjab Kings @ Kolkata Knight Riders",
            "date_utc": "2026-04-06",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-04-06T14:00:00Z"
      },
      {
            "match_no": 13,
            "home_team": "Rajasthan Royals",
            "away_team": "Mumbai Indians",
            "venue": "Guwahati",
            "fixture": "Mumbai Indians @ Rajasthan Royals",
            "date_utc": "2026-04-07",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-04-07T14:00:00Z"
      },
      {
            "match_no": 14,
            "home_team": "Delhi Capitals",
            "away_team": "Gujarat Titans",
            "venue": "Delhi",
            "fixture": "Gujarat Titans @ Delhi Capitals",
            "date_utc": "2026-04-08",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-04-08T14:00:00Z"
      },
      {
            "match_no": 15,
            "home_team": "Kolkata Knight Riders",
            "away_team": "Lucknow Super Giants",
            "venue": "Kolkata",
            "fixture": "Lucknow Super Giants @ Kolkata Knight Riders",
            "date_utc": "2026-04-09",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-04-09T14:00:00Z"
      },
      {
            "match_no": 16,
            "home_team": "Rajasthan Royals",
            "away_team": "Royal Challengers Bengaluru",
            "venue": "Guwahati",
            "fixture": "Royal Challengers Bengaluru @ Rajasthan Royals",
            "date_utc": "2026-04-10",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-04-10T14:00:00Z"
      },
      {
            "match_no": 17,
            "home_team": "Punjab Kings",
            "away_team": "Sunrisers Hyderabad",
            "venue": "New Chandigarh",
            "fixture": "Sunrisers Hyderabad @ Punjab Kings",
            "date_utc": "2026-04-11",
            "time_utc": "10:00:00Z",
            "datetime_utc": "2026-04-11T10:00:00Z"
      },
      {
            "match_no": 18,
            "home_team": "Chennai Super Kings",
            "away_team": "Delhi Capitals",
            "venue": "Chennai",
            "fixture": "Delhi Capitals @ Chennai Super Kings",
            "date_utc": "2026-04-11",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-04-11T14:00:00Z"
      },
      {
            "match_no": 19,
            "home_team": "Lucknow Super Giants",
            "away_team": "Gujarat Titans",
            "venue": "Lucknow",
            "fixture": "Gujarat Titans @ Lucknow Super Giants",
            "date_utc": "2026-04-12",
            "time_utc": "10:00:00Z",
            "datetime_utc": "2026-04-12T10:00:00Z"
      },
      {
            "match_no": 20,
            "home_team": "Mumbai Indians",
            "away_team": "Royal Challengers Bengaluru",
            "venue": "Mumbai",
            "fixture": "Royal Challengers Bengaluru @ Mumbai Indians",
            "date_utc": "2026-04-12",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-04-12T14:00:00Z"
      },
      {
            "match_no": 21,
            "home_team": "Sunrisers Hyderabad",
            "away_team": "Rajasthan Royals",
            "venue": "Hyderabad",
            "fixture": "Rajasthan Royals @ Sunrisers Hyderabad",
            "date_utc": "2026-04-13",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-04-13T14:00:00Z"
      },
      {
            "match_no": 22,
            "home_team": "Chennai Super Kings",
            "away_team": "Kolkata Knight Riders",
            "venue": "Chennai",
            "fixture": "Kolkata Knight Riders @ Chennai Super Kings",
            "date_utc": "2026-04-14",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-04-14T14:00:00Z"
      },
      {
            "match_no": 23,
            "home_team": "Royal Challengers Bengaluru",
            "away_team": "Lucknow Super Giants",
            "venue": "Bengaluru",
            "fixture": "Lucknow Super Giants @ Royal Challengers Bengaluru",
            "date_utc": "2026-04-15",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-04-15T14:00:00Z"
      },
      {
            "match_no": 24,
            "home_team": "Mumbai Indians",
            "away_team": "Punjab Kings",
            "venue": "Mumbai",
            "fixture": "Punjab Kings @ Mumbai Indians",
            "date_utc": "2026-04-16",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-04-16T14:00:00Z"
      },
      {
            "match_no": 25,
            "home_team": "Gujarat Titans",
            "away_team": "Kolkata Knight Riders",
            "venue": "Ahmedabad",
            "fixture": "Kolkata Knight Riders @ Gujarat Titans",
            "date_utc": "2026-04-17",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-04-17T14:00:00Z"
      },
      {
            "match_no": 26,
            "home_team": "Royal Challengers Bengaluru",
            "away_team": "Delhi Capitals",
            "venue": "Bengaluru",
            "fixture": "Delhi Capitals @ Royal Challengers Bengaluru",
            "date_utc": "2026-04-18",
            "time_utc": "10:00:00Z",
            "datetime_utc": "2026-04-18T10:00:00Z"
      },
      {
            "match_no": 27,
            "home_team": "Sunrisers Hyderabad",
            "away_team": "Chennai Super Kings",
            "venue": "Hyderabad",
            "fixture": "Chennai Super Kings @ Sunrisers Hyderabad",
            "date_utc": "2026-04-18",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-04-18T14:00:00Z"
      },
      {
            "match_no": 28,
            "home_team": "Kolkata Knight Riders",
            "away_team": "Rajasthan Royals",
            "venue": "Kolkata",
            "fixture": "Rajasthan Royals @ Kolkata Knight Riders",
            "date_utc": "2026-04-19",
            "time_utc": "10:00:00Z",
            "datetime_utc": "2026-04-19T10:00:00Z"
      },
      {
            "match_no": 29,
            "home_team": "Punjab Kings",
            "away_team": "Lucknow Super Giants",
            "venue": "New Chandigarh",
            "fixture": "Lucknow Super Giants @ Punjab Kings",
            "date_utc": "2026-04-19",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-04-19T14:00:00Z"
      },
      {
            "match_no": 30,
            "home_team": "Gujarat Titans",
            "away_team": "Mumbai Indians",
            "venue": "Ahmedabad",
            "fixture": "Mumbai Indians @ Gujarat Titans",
            "date_utc": "2026-04-20",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-04-20T14:00:00Z"
      },
      {
            "match_no": 31,
            "home_team": "Sunrisers Hyderabad",
            "away_team": "Delhi Capitals",
            "venue": "Hyderabad",
            "fixture": "Delhi Capitals @ Sunrisers Hyderabad",
            "date_utc": "2026-04-21",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-04-21T14:00:00Z"
      },
      {
            "match_no": 32,
            "home_team": "Lucknow Super Giants",
            "away_team": "Rajasthan Royals",
            "venue": "Lucknow",
            "fixture": "Rajasthan Royals @ Lucknow Super Giants",
            "date_utc": "2026-04-22",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-04-22T14:00:00Z"
      },
      {
            "match_no": 33,
            "home_team": "Mumbai Indians",
            "away_team": "Chennai Super Kings",
            "venue": "Mumbai",
            "fixture": "Chennai Super Kings @ Mumbai Indians",
            "date_utc": "2026-04-23",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-04-23T14:00:00Z"
      },
      {
            "match_no": 34,
            "home_team": "Royal Challengers Bengaluru",
            "away_team": "Gujarat Titans",
            "venue": "Bengaluru",
            "fixture": "Gujarat Titans @ Royal Challengers Bengaluru",
            "date_utc": "2026-04-24",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-04-24T14:00:00Z"
      },
      {
            "match_no": 35,
            "home_team": "Delhi Capitals",
            "away_team": "Punjab Kings",
            "venue": "Delhi",
            "fixture": "Punjab Kings @ Delhi Capitals",
            "date_utc": "2026-04-25",
            "time_utc": "10:00:00Z",
            "datetime_utc": "2026-04-25T10:00:00Z"
      },
      {
            "match_no": 36,
            "home_team": "Rajasthan Royals",
            "away_team": "Sunrisers Hyderabad",
            "venue": "Jaipur",
            "fixture": "Sunrisers Hyderabad @ Rajasthan Royals",
            "date_utc": "2026-04-25",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-04-25T14:00:00Z"
      },
      {
            "match_no": 37,
            "home_team": "Gujarat Titans",
            "away_team": "Chennai Super Kings",
            "venue": "Ahmedabad",
            "fixture": "Chennai Super Kings @ Gujarat Titans",
            "date_utc": "2026-04-26",
            "time_utc": "10:00:00Z",
            "datetime_utc": "2026-04-26T10:00:00Z"
      },
      {
            "match_no": 38,
            "home_team": "Lucknow Super Giants",
            "away_team": "Kolkata Knight Riders",
            "venue": "Lucknow",
            "fixture": "Kolkata Knight Riders @ Lucknow Super Giants",
            "date_utc": "2026-04-26",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-04-26T14:00:00Z"
      },
      {
            "match_no": 39,
            "home_team": "Delhi Capitals",
            "away_team": "Royal Challengers Bengaluru",
            "venue": "Delhi",
            "fixture": "Royal Challengers Bengaluru @ Delhi Capitals",
            "date_utc": "2026-04-27",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-04-27T14:00:00Z"
      },
      {
            "match_no": 40,
            "home_team": "Punjab Kings",
            "away_team": "Rajasthan Royals",
            "venue": "New Chandigarh",
            "fixture": "Rajasthan Royals @ Punjab Kings",
            "date_utc": "2026-04-28",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-04-28T14:00:00Z"
      },
      {
            "match_no": 41,
            "home_team": "Mumbai Indians",
            "away_team": "Sunrisers Hyderabad",
            "venue": "Mumbai",
            "fixture": "Sunrisers Hyderabad @ Mumbai Indians",
            "date_utc": "2026-04-29",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-04-29T14:00:00Z"
      },
      {
            "match_no": 42,
            "home_team": "Gujarat Titans",
            "away_team": "Royal Challengers Bengaluru",
            "venue": "Ahmedabad",
            "fixture": "Royal Challengers Bengaluru @ Gujarat Titans",
            "date_utc": "2026-04-30",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-04-30T14:00:00Z"
      },
      {
            "match_no": 43,
            "home_team": "Rajasthan Royals",
            "away_team": "Delhi Capitals",
            "venue": "Jaipur",
            "fixture": "Delhi Capitals @ Rajasthan Royals",
            "date_utc": "2026-05-01",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-05-01T14:00:00Z"
      },
      {
            "match_no": 44,
            "home_team": "Chennai Super Kings",
            "away_team": "Mumbai Indians",
            "venue": "Chennai",
            "fixture": "Mumbai Indians @ Chennai Super Kings",
            "date_utc": "2026-05-02",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-05-02T14:00:00Z"
      },
      {
            "match_no": 45,
            "home_team": "Sunrisers Hyderabad",
            "away_team": "Kolkata Knight Riders",
            "venue": "Hyderabad",
            "fixture": "Kolkata Knight Riders @ Sunrisers Hyderabad",
            "date_utc": "2026-05-03",
            "time_utc": "10:00:00Z",
            "datetime_utc": "2026-05-03T10:00:00Z"
      },
      {
            "match_no": 46,
            "home_team": "Gujarat Titans",
            "away_team": "Punjab Kings",
            "venue": "Ahmedabad",
            "fixture": "Punjab Kings @ Gujarat Titans",
            "date_utc": "2026-05-03",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-05-03T14:00:00Z"
      },
      {
            "match_no": 47,
            "home_team": "Mumbai Indians",
            "away_team": "Lucknow Super Giants",
            "venue": "Mumbai",
            "fixture": "Lucknow Super Giants @ Mumbai Indians",
            "date_utc": "2026-05-04",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-05-04T14:00:00Z"
      },
      {
            "match_no": 48,
            "home_team": "Delhi Capitals",
            "away_team": "Chennai Super Kings",
            "venue": "Delhi",
            "fixture": "Chennai Super Kings @ Delhi Capitals",
            "date_utc": "2026-05-05",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-05-05T14:00:00Z"
      },
      {
            "match_no": 49,
            "home_team": "Sunrisers Hyderabad",
            "away_team": "Punjab Kings",
            "venue": "Hyderabad",
            "fixture": "Punjab Kings @ Sunrisers Hyderabad",
            "date_utc": "2026-05-06",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-05-06T14:00:00Z"
      },
      {
            "match_no": 50,
            "home_team": "Lucknow Super Giants",
            "away_team": "Royal Challengers Bengaluru",
            "venue": "Lucknow",
            "fixture": "Royal Challengers Bengaluru @ Lucknow Super Giants",
            "date_utc": "2026-05-07",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-05-07T14:00:00Z"
      },
      {
            "match_no": 51,
            "home_team": "Delhi Capitals",
            "away_team": "Kolkata Knight Riders",
            "venue": "Delhi",
            "fixture": "Kolkata Knight Riders @ Delhi Capitals",
            "date_utc": "2026-05-08",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-05-08T14:00:00Z"
      },
      {
            "match_no": 52,
            "home_team": "Rajasthan Royals",
            "away_team": "Gujarat Titans",
            "venue": "Jaipur",
            "fixture": "Gujarat Titans @ Rajasthan Royals",
            "date_utc": "2026-05-09",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-05-09T14:00:00Z"
      },
      {
            "match_no": 53,
            "home_team": "Chennai Super Kings",
            "away_team": "Lucknow Super Giants",
            "venue": "Chennai",
            "fixture": "Lucknow Super Giants @ Chennai Super Kings",
            "date_utc": "2026-05-10",
            "time_utc": "10:00:00Z",
            "datetime_utc": "2026-05-10T10:00:00Z"
      },
      {
            "match_no": 54,
            "home_team": "Royal Challengers Bengaluru",
            "away_team": "Mumbai Indians",
            "venue": "Raipur",
            "fixture": "Mumbai Indians @ Royal Challengers Bengaluru",
            "date_utc": "2026-05-10",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-05-10T14:00:00Z"
      },
      {
            "match_no": 55,
            "home_team": "Punjab Kings",
            "away_team": "Delhi Capitals",
            "venue": "Dharamshala",
            "fixture": "Delhi Capitals @ Punjab Kings",
            "date_utc": "2026-05-11",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-05-11T14:00:00Z"
      },
      {
            "match_no": 56,
            "home_team": "Gujarat Titans",
            "away_team": "Sunrisers Hyderabad",
            "venue": "Ahmedabad",
            "fixture": "Sunrisers Hyderabad @ Gujarat Titans",
            "date_utc": "2026-05-12",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-05-12T14:00:00Z"
      },
      {
            "match_no": 57,
            "home_team": "Royal Challengers Bengaluru",
            "away_team": "Kolkata Knight Riders",
            "venue": "Raipur",
            "fixture": "Kolkata Knight Riders @ Royal Challengers Bengaluru",
            "date_utc": "2026-05-13",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-05-13T14:00:00Z"
      },
      {
            "match_no": 58,
            "home_team": "Punjab Kings",
            "away_team": "Mumbai Indians",
            "venue": "Dharamshala",
            "fixture": "Mumbai Indians @ Punjab Kings",
            "date_utc": "2026-05-14",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-05-14T14:00:00Z"
      },
      {
            "match_no": 59,
            "home_team": "Lucknow Super Giants",
            "away_team": "Chennai Super Kings",
            "venue": "Lucknow",
            "fixture": "Chennai Super Kings @ Lucknow Super Giants",
            "date_utc": "2026-05-15",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-05-15T14:00:00Z"
      },
      {
            "match_no": 60,
            "home_team": "Kolkata Knight Riders",
            "away_team": "Gujarat Titans",
            "venue": "Kolkata",
            "fixture": "Gujarat Titans @ Kolkata Knight Riders",
            "date_utc": "2026-05-16",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-05-16T14:00:00Z"
      },
      {
            "match_no": 61,
            "home_team": "Punjab Kings",
            "away_team": "Royal Challengers Bengaluru",
            "venue": "Dharamshala",
            "fixture": "Royal Challengers Bengaluru @ Punjab Kings",
            "date_utc": "2026-05-17",
            "time_utc": "10:00:00Z",
            "datetime_utc": "2026-05-17T10:00:00Z"
      },
      {
            "match_no": 62,
            "home_team": "Delhi Capitals",
            "away_team": "Rajasthan Royals",
            "venue": "Delhi",
            "fixture": "Rajasthan Royals @ Delhi Capitals",
            "date_utc": "2026-05-17",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-05-17T14:00:00Z"
      },
      {
            "match_no": 63,
            "home_team": "Chennai Super Kings",
            "away_team": "Sunrisers Hyderabad",
            "venue": "Chennai",
            "fixture": "Sunrisers Hyderabad @ Chennai Super Kings",
            "date_utc": "2026-05-18",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-05-18T14:00:00Z"
      },
      {
            "match_no": 64,
            "home_team": "Rajasthan Royals",
            "away_team": "Lucknow Super Giants",
            "venue": "Jaipur",
            "fixture": "Lucknow Super Giants @ Rajasthan Royals",
            "date_utc": "2026-05-19",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-05-19T14:00:00Z"
      },
      {
            "match_no": 65,
            "home_team": "Kolkata Knight Riders",
            "away_team": "Mumbai Indians",
            "venue": "Kolkata",
            "fixture": "Mumbai Indians @ Kolkata Knight Riders",
            "date_utc": "2026-05-20",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-05-20T14:00:00Z"
      },
      {
            "match_no": 66,
            "home_team": "Chennai Super Kings",
            "away_team": "Gujarat Titans",
            "venue": "Chennai",
            "fixture": "Gujarat Titans @ Chennai Super Kings",
            "date_utc": "2026-05-21",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-05-21T14:00:00Z"
      },
      {
            "match_no": 67,
            "home_team": "Sunrisers Hyderabad",
            "away_team": "Royal Challengers Bengaluru",
            "venue": "Hyderabad",
            "fixture": "Royal Challengers Bengaluru @ Sunrisers Hyderabad",
            "date_utc": "2026-05-22",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-05-22T14:00:00Z"
      },
      {
            "match_no": 68,
            "home_team": "Lucknow Super Giants",
            "away_team": "Punjab Kings",
            "venue": "Lucknow",
            "fixture": "Punjab Kings @ Lucknow Super Giants",
            "date_utc": "2026-05-23",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-05-23T14:00:00Z"
      },
      {
            "match_no": 69,
            "home_team": "Mumbai Indians",
            "away_team": "Rajasthan Royals",
            "venue": "Mumbai",
            "fixture": "Rajasthan Royals @ Mumbai Indians",
            "date_utc": "2026-05-24",
            "time_utc": "10:00:00Z",
            "datetime_utc": "2026-05-24T10:00:00Z"
      },
      {
            "match_no": 70,
            "home_team": "Kolkata Knight Riders",
            "away_team": "Delhi Capitals",
            "venue": "Kolkata",
            "fixture": "Delhi Capitals @ Kolkata Knight Riders",
            "date_utc": "2026-05-24",
            "time_utc": "14:00:00Z",
            "datetime_utc": "2026-05-24T14:00:00Z"
      }
];
    let LEAGUE_STAGE_SCHEDULE = LEAGUE_STAGE_SCHEDULE_FALLBACK.slice();


    // ========= MANUAL LIVE DATA FALLBACK =========
    // The app can fetch live stats if you wire in richer sources later.
    // For now, this object guarantees the page works and the scoring engine is correct.
    // Update any rank arrays here while the season unfolds, or plug into your fetch layer.
    const LIVE_2026 = {
      season: 2026,
      fetchedAt: new Date().toISOString(),
      titleWinner: { winner: null },
      orangeCap: { ranking: [] },
      mostSixes: { ranking: [] },
      purpleCap: { ranking: [] },
      mostDots: { ranking: [] },
      mvp: { ranking: [] },
      uncappedMvp: { winner: null },
      fairPlay: { winner: null },
      highestScoreTeam: { winner: null },
      striker: { ranking: [] },
      bestBowlingFigures: { ranking: [] },
      bestBowlingStrikeRate: { ranking: [] },
      mostCatches: { ranking: [] },
      tableBottom: { winner: null },
      leastMvp: { ranking: [] }
    };

    // ========= OPTIONAL LIVE SOURCE HOOKS =========
    // Drop fetched results into LIVE_2026 with ONLY IPL 2026 data.
    // Example expected shape for a top-5 category: { ranking: ['Player A','Player B','Player C','Player D','Player E'] }
    // Example winner category: { winner: 'MI' }

    const TEAM_NAME_ALIASES = {
      mi: 'mumbai indians',
      'mumbai indians': 'mumbai indians',
      rcb: 'royal challengers bengaluru',
      'royal challengers bengaluru': 'royal challengers bengaluru',
      'royal challengers bangalore': 'royal challengers bengaluru',
      csk: 'chennai super kings',
      'chennai super kings': 'chennai super kings',
      srh: 'sunrisers hyderabad',
      'sunrisers hyderabad': 'sunrisers hyderabad',
      gt: 'gujarat titans',
      'gujarat titans': 'gujarat titans',
      lsg: 'lucknow super giants',
      'lucknow super giants': 'lucknow super giants',
      dc: 'delhi capitals',
      'delhi capitals': 'delhi capitals',
      pbks: 'punjab kings',
      'punjab kings': 'punjab kings',
      rr: 'rajasthan royals',
      'rajasthan royals': 'rajasthan royals',
      kkr: 'kolkata knight riders',
      'kolkata knight riders': 'kolkata knight riders'
    };


    const PLAYER_NAME_ALIASES = {
          "a ankolekar": "atharva ankolekar",
          "a badoni": "ayush badoni",
          "a ghazanfar": "allah ghazanfar",
          "a hosein": "akeal hosein",
          "a kamboj": "anshul kamboj",
          "a khan": "aman khan",
          "a kulkarni": "arshin kulkarni",
          "a kumar": "ashwani kumar",
          "a mandal": "ajay mandal",
          "a markram": "aiden markram",
          "a mhatre": "ayush mhatre",
          "a milne": "adam milne",
          "a nabi": "auqib nabi",
          "a nortje": "anrich nortje",
          "a omarzai": "azmatullah omarzai",
          "a patel": "axar patel",
          "a porel": "abishek porel",
          "a r perala": "aman rao perala",
          "a raghuvanshi": "angkrish raghuvanshi",
          "a raghuwanshi": "akshat raghuwanshi",
          "a rahane": "ajinkya rahane",
          "a rawat": "anuj rawat",
          "a roy": "anukul roy",
          "a samad": "abdul samad",
          "a sharma": "ashutosh sharma",
          "a singh": "akash singh",
          "a tendulkar": "arjun tendulkar",
          "a verma": "aniket verma",
          "abdul samad": "abdul samad",
          "abhinandan singh": "abhinandan singh",
          "abhishek sharma": "abhishek sharma",
          "abishek porel": "abishek porel",
          "abishek sharma": "abhishek sharma",
          "adam milne": "adam milne",
          "ahamad": "shahbaz ahamad",
          "ahmad": "noor ahmad",
          "ahmed": "khaleel ahmed",
          "aiden markram": "aiden markram",
          "ajay mandal": "ajay mandal",
          "ajinkya rahane": "ajinkya rahane",
          "akash singh": "akash singh",
          "akeal hosein": "akeal hosein",
          "akshat raghuwanshi": "akshat raghuwanshi",
          "allah ghazanfar": "allah ghazanfar",
          "allen": "finn allen",
          "am ghazanfar": "allah ghazanfar",
          "aman khan": "aman khan",
          "aman perala": "aman rao perala",
          "aman rao perala": "aman rao perala",
          "amit kumar": "amit kumar",
          "angkrish raghuvanshi": "angkrish raghuvanshi",
          "aniket verma": "aniket verma",
          "ankolekar": "atharva ankolekar",
          "anrich nortje": "anrich nortje",
          "ansari": "zeeshan ansari",
          "anshul kamboj": "anshul kamboj",
          "anuj rawat": "anuj rawat",
          "anukul roy": "anukul roy",
          "ar perala": "aman rao perala",
          "archer": "jofra archer",
          "arjun tendulkar": "arjun tendulkar",
          "arshdeep singh": "arshdeep singh",
          "arshin kulkarni": "arshin kulkarni",
          "arya": "priyansh arya",
          "ashok sharma": "ashok sharma",
          "ashutosh sharma": "ashutosh sharma",
          "ashwani kumar": "ashwani kumar",
          "atharva ankolekar": "atharva ankolekar",
          "auqib nabi": "auqib nabi",
          "avesh khan": "avesh khan",
          "avinash": "pyla avinash",
          "axar patel": "axar patel",
          "ayush badoni": "ayush badoni",
          "ayush mhatre": "ayush mhatre",
          "azmatullah omarzai": "azmatullah omarzai",
          "b carse": "brydon carse",
          "b duckett": "ben duckett",
          "b dwarshuis": "ben dwarshuis",
          "b kumar": "bhuvneshwar kumar",
          "b muzarabani": "blessing muzarabani",
          "b sharma": "brijesh sharma",
          "badoni": "ayush badoni",
          "banton": "tom banton",
          "bartlett": "xavier bartlett",
          "bawa": "raj angad bawa",
          "ben duckett": "ben duckett",
          "ben dwarshuis": "ben dwarshuis",
          "bethell": "jacob bethell",
          "bhuvneshwar kumar": "bhuvneshwar kumar",
          "bishnoi": "ravi bishnoi",
          "blessing muzarabani": "blessing muzarabani",
          "bosch": "corbin bosch",
          "boult": "trent boult",
          "breetzke": "matthew breetzke",
          "brevis": "dewald brevis",
          "brijesh sharma": "brijesh sharma",
          "brydon carse": "brydon carse",
          "bumrah": "jasprit bumrah",
          "burger": "nandre burger",
          "buttler": "jos buttler",
          "c bosch": "corbin bosch",
          "c connolly": "cooper connolly",
          "c green": "cameron green",
          "cameron green": "cameron green",
          "carse": "brydon carse",
          "chahal": "yuzvendra chahal",
          "chakaravarthy": "varun chakaravarthy",
          "chameera": "dushmantha chameera",
          "charak": "yudhvir singh charak",
          "chouhan": "kanishk chouhan",
          "connolly": "cooper connolly",
          "cooper connolly": "cooper connolly",
          "corbin bosch": "corbin bosch",
          "cox": "jordan cox",
          "cummins": "pat cummins",
          "d brevis": "dewald brevis",
          "d chahar": "deepak chahar",
          "d chameera": "dushmantha chameera",
          "d ferreira": "donovan ferreira",
          "d jurel": "dhruv jurel",
          "d kamra": "daksh kamra",
          "d malewar": "danish malewar",
          "d miller": "david miller",
          "d padikkal": "devdutt padikkal",
          "d payne": "david payne",
          "d shanaka": "dasun shanaka",
          "d singh": "digvesh singh",
          "daksh kamra": "daksh kamra",
          "danish malewar": "danish malewar",
          "dar": "rasikh dar",
          "dasun shanaka": "dasun shanaka",
          "david": "tim david",
          "david miller": "david miller",
          "david payne": "david payne",
          "dayal": "yash dayal",
          "deepak chahar": "deepak chahar",
          "deshpande": "tushar deshpande",
          "deswal": "satvik deswal",
          "devdutt padikkal": "devdutt padikkal",
          "dewald brevis": "dewald brevis",
          "dhir": "naman dhir",
          "dhoni": "ms dhoni",
          "dhruv jurel": "dhruv jurel",
          "digvesh singh": "digvesh singh",
          "donovan ferreira": "donovan ferreira",
          "dube": "shivam dube",
          "duckett": "ben duckett",
          "duffy": "jacob duffy",
          "dushmantha chameera": "dushmantha chameera",
          "dwarshuis": "ben dwarshuis",
          "e malinga": "eshan malinga",
          "eshan malinga": "eshan malinga",
          "f allen": "finn allen",
          "ferguson": "lockie ferguson",
          "ferreira": "donovan ferreira",
          "finn allen": "finn allen",
          "foulkes": "zak foulkes",
          "fuletra": "krains fuletra",
          "g phillips": "glenn phillips",
          "g s brar": "gurnoor singh brar",
          "g singh": "gurjapneet singh",
          "gaikwad": "ruturaj gaikwad",
          "ghazanfar": "allah ghazanfar",
          "ghosh": "ramakrishna ghosh",
          "gill": "shubman gill",
          "glenn phillips": "glenn phillips",
          "gopal": "shreyas gopal",
          "green": "cameron green",
          "gs brar": "gurnoor singh brar",
          "gurjapneet singh": "gurjapneet singh",
          "gurnoor brar": "gurnoor singh brar",
          "gurnoor singh brar": "gurnoor singh brar",
          "h brar": "harpreet brar",
          "h dubey": "harsh dubey",
          "h klaasen": "heinrich klaasen",
          "h pandya": "hardik pandya",
          "h pannu": "harnoor pannu",
          "h patel": "harshal patel",
          "h singh": "himmat singh",
          "hardik pandya": "hardik pandya",
          "harnoor pannu": "harnoor pannu",
          "harpreet brar": "harpreet brar",
          "harsh dubey": "harsh dubey",
          "harshal patel": "harshal patel",
          "hasaranga": "wanindu hasaranga",
          "hazlewood": "josh hazlewood",
          "head": "travis head",
          "heinrich klaasen": "heinrich klaasen",
          "henry": "matt henry",
          "hetmyer": "shimron hetmyer",
          "himmat singh": "himmat singh",
          "hinge": "praful hinge",
          "holder": "jason holder",
          "hosein": "akeal hosein",
          "hussain": "sakib hussain",
          "i kishan": "ishan kishan",
          "i sharma": "ishant sharma",
          "inglis": "josh inglis",
          "ishan kishan": "ishan kishan",
          "ishant sharma": "ishant sharma",
          "izhar": "mohammad izhar",
          "j archer": "jofra archer",
          "j bethell": "jacob bethell",
          "j bumrah": "jasprit bumrah",
          "j buttler": "jos buttler",
          "j cox": "jordan cox",
          "j duffy": "jacob duffy",
          "j hazlewood": "josh hazlewood",
          "j holder": "jason holder",
          "j inglis": "josh inglis",
          "j overton": "jamie overton",
          "j sharma": "jitesh sharma",
          "j unadkat": "jaydev unadkat",
          "j yadav": "jayant yadav",
          "jacks": "will jacks",
          "jacob bethell": "jacob bethell",
          "jacob duffy": "jacob duffy",
          "jadeja": "ravindra jadeja",
          "jaiswal": "yashasvi jaiswal",
          "jamie overton": "jamie overton",
          "jamieson": "kyle jamieson",
          "jansen": "marco jansen",
          "jason holder": "jason holder",
          "jasprit bumrah": "jasprit bumrah",
          "jayant yadav": "jayant yadav",
          "jaydev unadkat": "jaydev unadkat",
          "jitesh sharma": "jitesh sharma",
          "jofra archer": "jofra archer",
          "johnson": "spencer johnson",
          "jordan cox": "jordan cox",
          "jos buttler": "jos buttler",
          "josh hazlewood": "josh hazlewood",
          "josh inglis": "josh inglis",
          "jurel": "dhruv jurel",
          "k ahmed": "khaleel ahmed",
          "k chouhan": "kanishk chouhan",
          "k fuletra": "krains fuletra",
          "k jamieson": "kyle jamieson",
          "k khejroliya": "kulwant khejroliya",
          "k kushagra": "kumar kushagra",
          "k maphaka": "kwena maphaka",
          "k mendis": "kamindu mendis",
          "k nair": "karun nair",
          "k pandya": "krunal pandya",
          "k rabada": "kagiso rabada",
          "k rahul": "kl rahul",
          "k sen": "kuldeep sen",
          "k sharma": "kartik sharma",
          "k tyagi": "kartik tyagi",
          "k yadav": "kuldeep yadav",
          "kagiso rabada": "kagiso rabada",
          "kamboj": "anshul kamboj",
          "kamindu mendis": "kamindu mendis",
          "kamra": "daksh kamra",
          "kanishk chouhan": "kanishk chouhan",
          "kartik sharma": "kartik sharma",
          "kartik tyagi": "kartik tyagi",
          "karun nair": "karun nair",
          "khaleel ahmed": "khaleel ahmed",
          "khejroliya": "kulwant khejroliya",
          "kishan": "ishan kishan",
          "kishore": "sai kishore",
          "kl rahul": "kl rahul",
          "klaasen": "heinrich klaasen",
          "kock": "quinton de kock",
          "kohli": "virat kohli",
          "krains fuletra": "krains fuletra",
          "krishna": "prasidh krishna",
          "krunal pandya": "krunal pandya",
          "kuldeep sen": "kuldeep sen",
          "kuldeep yadav": "kuldeep yadav",
          "kulkarni": "arshin kulkarni",
          "kulwant khejroliya": "kulwant khejroliya",
          "kumar kushagra": "kumar kushagra",
          "kushagra": "kumar kushagra",
          "kwena maphaka": "kwena maphaka",
          "kyle jamieson": "kyle jamieson",
          "l d pretorious": "lhuan dre pretorious",
          "l ferguson": "lockie ferguson",
          "l livingstone": "liam livingstone",
          "l ngidi": "lungisani ngidi",
          "l wood": "luke wood",
          "ld pretorious": "lhuan dre pretorious",
          "lhuan dre pretorious": "lhuan dre pretorious",
          "lhuan pretorious": "lhuan dre pretorious",
          "liam livingstone": "liam livingstone",
          "livingstone": "liam livingstone",
          "lockie ferguson": "lockie ferguson",
          "luke wood": "luke wood",
          "lungisani ngidi": "lungisani ngidi",
          "m a khan": "mohd arshad khan",
          "m breetzke": "matthew breetzke",
          "m choudhary": "mukesh choudhary",
          "m dhoni": "ms dhoni",
          "m henry": "matt henry",
          "m izhar": "mohammad izhar",
          "m jansen": "marco jansen",
          "m khan": "mohsin khan",
          "m kumar": "mukesh kumar",
          "m markande": "mayank markande",
          "m marsh": "mitchell marsh",
          "m owen": "mitch owen",
          "m pandey": "manish pandey",
          "m pathirana": "matheesha pathirana",
          "m rawat": "mayank rawat",
          "m santner": "mitchell santner",
          "m shami": "mohammad shami",
          "m siddharth": "m siddharth",
          "m siraj": "mohammed siraj",
          "m starc": "mitchell starc",
          "m stoinis": "marcus stoinis",
          "m suthar": "manav suthar",
          "m tiwari": "madhav tiwari",
          "m w short": "matthew william short",
          "m yadav": "mayank yadav",
          "ma khan": "mohd arshad khan",
          "madhav tiwari": "madhav tiwari",
          "mahendra singh dhoni": "ms dhoni",
          "malewar": "danish malewar",
          "malhotra": "vihaan malhotra",
          "malik": "umran malik",
          "malinga": "eshan malinga",
          "manav suthar": "manav suthar",
          "mandal": "ajay mandal",
          "mangesh yadav": "mangesh yadav",
          "manish pandey": "manish pandey",
          "maphaka": "kwena maphaka",
          "marco jansen": "marco jansen",
          "marcus stoinis": "marcus stoinis",
          "markande": "mayank markande",
          "markram": "aiden markram",
          "marsh": "mitchell marsh",
          "matheesha pathirana": "matheesha pathirana",
          "matt henry": "matt henry",
          "matthew breetzke": "matthew breetzke",
          "matthew short": "matthew william short",
          "matthew william short": "matthew william short",
          "mavi": "shivam mavi",
          "mayank markande": "mayank markande",
          "mayank rawat": "mayank rawat",
          "mayank yadav": "mayank yadav",
          "mendis": "kamindu mendis",
          "mhatre": "ayush mhatre",
          "miller": "david miller",
          "milne": "adam milne",
          "minz": "robin minz",
          "mishra": "sushant mishra",
          "mitch owen": "mitch owen",
          "mitchell marsh": "mitchell marsh",
          "mitchell santner": "mitchell santner",
          "mitchell starc": "mitchell starc",
          "mohammad izhar": "mohammad izhar",
          "mohammad shami": "mohammad shami",
          "mohammed siraj": "mohammed siraj",
          "mohd arshad khan": "mohd arshad khan",
          "mohd khan": "mohd arshad khan",
          "mohsin khan": "mohsin khan",
          "ms dhoni": "ms dhoni",
          "mukesh choudhary": "mukesh choudhary",
          "mukesh kumar": "mukesh kumar",
          "mukul choudhary": "mukul choudhary",
          "musheer khan": "musheer khan",
          "muzarabani": "blessing muzarabani",
          "mw short": "matthew william short",
          "n ahmad": "noor ahmad",
          "n burger": "nandre burger",
          "n dhir": "naman dhir",
          "n k reddy": "nitish kumar reddy",
          "n pooran": "nicholas pooran",
          "n rana": "nitish rana",
          "n saini": "navdeep saini",
          "n sindhu": "nishant sindhu",
          "n t varma": "n tilak varma",
          "n thushara": "nuwan thushara",
          "n tilak varma": "n tilak varma",
          "n tiwari": "naman tiwari",
          "n varma": "n tilak varma",
          "n wadhera": "nehal wadhera",
          "nabi": "auqib nabi",
          "nair": "karun nair",
          "naman dhir": "naman dhir",
          "naman tiwari": "naman tiwari",
          "nandre burger": "nandre burger",
          "narine": "sunil narine",
          "natarajan": "t natarajan",
          "navdeep saini": "navdeep saini",
          "nehal wadhera": "nehal wadhera",
          "ngidi": "lungisani ngidi",
          "nicholas pooran": "nicholas pooran",
          "nigam": "vipraj nigam",
          "nishad": "vishal nishad",
          "nishant sindhu": "nishant sindhu",
          "nissanka": "pathum nissanka",
          "nitish kumar reddy": "nitish kumar reddy",
          "nitish rana": "nitish rana",
          "nitish reddy": "nitish kumar reddy",
          "nk reddy": "nitish kumar reddy",
          "noor ahmad": "noor ahmad",
          "nortje": "anrich nortje",
          "nt varma": "n tilak varma",
          "nuwan thushara": "nuwan thushara",
          "o tarmale": "onkar tarmale",
          "omarzai": "azmatullah omarzai",
          "onkar tarmale": "onkar tarmale",
          "ostwal": "vicky ostwal",
          "overton": "jamie overton",
          "owen": "mitch owen",
          "p arya": "priyansh arya",
          "p avinash": "pyla avinash",
          "p cummins": "pat cummins",
          "p dubey": "pravin dubey",
          "p hinge": "praful hinge",
          "p krishna": "prasidh krishna",
          "p nissanka": "pathum nissanka",
          "p salt": "phil salt",
          "p shaw": "prithvi shaw",
          "p singh": "prabhsimran singh",
          "p solanki": "prashant solanki",
          "p veer": "prashant veer",
          "p yadav": "prince yadav",
          "padikkal": "devdutt padikkal",
          "pandey": "manish pandey",
          "pannu": "harnoor pannu",
          "pant": "rishabh pant",
          "parag": "riyan parag",
          "parakh": "sahil parakh",
          "pat cummins": "pat cummins",
          "pathirana": "matheesha pathirana",
          "pathum nissanka": "pathum nissanka",
          "patidar": "rajat patidar",
          "payne": "david payne",
          "perala": "aman rao perala",
          "phil salt": "phil salt",
          "philip salt": "phil salt",
          "phillips": "glenn phillips",
          "pooran": "nicholas pooran",
          "porel": "abishek porel",
          "powell": "rovman powell",
          "prabhsimran singh": "prabhsimran singh",
          "praful hinge": "praful hinge",
          "prashant solanki": "prashant solanki",
          "prashant veer": "prashant veer",
          "prasidh krishna": "prasidh krishna",
          "pravin dubey": "pravin dubey",
          "pretorious": "lhuan dre pretorious",
          "prince yadav": "prince yadav",
          "prithvi shaw": "prithvi shaw",
          "priyansh arya": "priyansh arya",
          "punja": "yash raj punja",
          "puthur": "vignesh puthur",
          "pyla avinash": "pyla avinash",
          "q d kock": "quinton de kock",
          "qd kock": "quinton de kock",
          "quinton de kock": "quinton de kock",
          "quinton kock": "quinton de kock",
          "r a bawa": "raj angad bawa",
          "r bishnoi": "ravi bishnoi",
          "r chahar": "rahul chahar",
          "r dar": "rasikh dar",
          "r gaikwad": "ruturaj gaikwad",
          "r ghosh": "ramakrishna ghosh",
          "r jadeja": "ravindra jadeja",
          "r khan": "rashid khan",
          "r minz": "robin minz",
          "r pant": "rishabh pant",
          "r parag": "riyan parag",
          "r patidar": "rajat patidar",
          "r powell": "rovman powell",
          "r ravindra": "rachin ravindra",
          "r rickelton": "ryan rickelton",
          "r sharma": "rohit sharma",
          "r shepherd": "romario shepherd",
          "r singh": "rinku singh",
          "r tewatia": "rahul tewatia",
          "r tripathi": "rahul tripathi",
          "ra bawa": "raj angad bawa",
          "rabada": "kagiso rabada",
          "rachin ravindra": "rachin ravindra",
          "raghu sharma": "raghu sharma",
          "raghuvanshi": "angkrish raghuvanshi",
          "raghuwanshi": "akshat raghuwanshi",
          "rahane": "ajinkya rahane",
          "rahul": "kl rahul",
          "rahul chahar": "rahul chahar",
          "rahul tewatia": "rahul tewatia",
          "rahul tripathi": "rahul tripathi",
          "raj angad bawa": "raj angad bawa",
          "raj bawa": "raj angad bawa",
          "rajat patidar": "rajat patidar",
          "ramakrishna ghosh": "ramakrishna ghosh",
          "ramandeep singh": "ramandeep singh",
          "rana": "nitish rana",
          "ranjan": "sarthak ranjan",
          "rashid khan": "rashid khan",
          "rasikh dar": "rasikh dar",
          "ravi bishnoi": "ravi bishnoi",
          "ravi singh": "ravi singh",
          "ravichandran": "smaran ravichandran",
          "ravindra": "rachin ravindra",
          "ravindra jadeja": "ravindra jadeja",
          "reddy": "nitish kumar reddy",
          "rickelton": "ryan rickelton",
          "rinku singh": "rinku singh",
          "rishabh pant": "rishabh pant",
          "riyan parag": "riyan parag",
          "rizvi": "sameer rizvi",
          "robin minz": "robin minz",
          "rohit sharma": "rohit sharma",
          "romario shepherd": "romario shepherd",
          "rovman powell": "rovman powell",
          "roy": "anukul roy",
          "rutherford": "sherfane rutherford",
          "ruturaj gaikwad": "ruturaj gaikwad",
          "ryan rickelton": "ryan rickelton",
          "s ahamad": "shahbaz ahamad",
          "s arora": "salil arora",
          "s deswal": "satvik deswal",
          "s dube": "shivam dube",
          "s dubey": "saurabh dubey",
          "s gill": "shubman gill",
          "s gopal": "shreyas gopal",
          "s hetmyer": "shimron hetmyer",
          "s hussain": "sakib hussain",
          "s iyer": "shreyas iyer",
          "s johnson": "spencer johnson",
          "s k yadav": "surya kumar yadav",
          "s khan": "sarfaraz khan",
          "s kishore": "sai kishore",
          "s kumar": "shivang kumar",
          "s mavi": "shivam mavi",
          "s mishra": "sushant mishra",
          "s narine": "sunil narine",
          "s parakh": "sahil parakh",
          "s ranjan": "sarthak ranjan",
          "s ravichandran": "smaran ravichandran",
          "s rizvi": "sameer rizvi",
          "s rutherford": "sherfane rutherford",
          "s samson": "sanju samson",
          "s sharma": "sandeep sharma",
          "s shedge": "suryansh shedge",
          "s singh": "shashank singh",
          "s sudharsan": "sai sudharsan",
          "s thakur": "shardul thakur",
          "sahil parakh": "sahil parakh",
          "sai kishore": "sai kishore",
          "sai sudharsan": "sai sudharsan",
          "saini": "navdeep saini",
          "sakib hussain": "sakib hussain",
          "salil arora": "salil arora",
          "salt": "phil salt",
          "samad": "abdul samad",
          "sameer rizvi": "sameer rizvi",
          "samson": "sanju samson",
          "sandeep sharma": "sandeep sharma",
          "sanju samson": "sanju samson",
          "santner": "mitchell santner",
          "sarfaraz khan": "sarfaraz khan",
          "sarthak ranjan": "sarthak ranjan",
          "satvik deswal": "satvik deswal",
          "saurabh dubey": "saurabh dubey",
          "seifert": "tim seifert",
          "sen": "kuldeep sen",
          "shahbaz ahamad": "shahbaz ahamad",
          "shahrukh khan": "shahrukh khan",
          "shami": "mohammad shami",
          "shanaka": "dasun shanaka",
          "shardul thakur": "shardul thakur",
          "shashank singh": "shashank singh",
          "shaw": "prithvi shaw",
          "shedge": "suryansh shedge",
          "shepherd": "romario shepherd",
          "sherfane rutherford": "sherfane rutherford",
          "shimron hetmyer": "shimron hetmyer",
          "shivam dube": "shivam dube",
          "shivam mavi": "shivam mavi",
          "shivang kumar": "shivang kumar",
          "short": "matthew william short",
          "shreyas gopal": "shreyas gopal",
          "shreyas iyer": "shreyas iyer",
          "shubham dubey": "shubham dubey",
          "shubman gill": "shubman gill",
          "siddharth": "m siddharth",
          "sindhu": "nishant sindhu",
          "siraj": "mohammed siraj",
          "sk yadav": "surya kumar yadav",
          "smaran ravichandran": "smaran ravichandran",
          "solanki": "prashant solanki",
          "spencer johnson": "spencer johnson",
          "starc": "mitchell starc",
          "stoinis": "marcus stoinis",
          "stubbs": "tristan stubbs",
          "sudharsan": "sai sudharsan",
          "sundar": "washington sundar",
          "sunil narine": "sunil narine",
          "surya kumar yadav": "surya kumar yadav",
          "surya yadav": "surya kumar yadav",
          "suryansh shedge": "suryansh shedge",
          "suryavanshi": "vaibhav suryavanshi",
          "sushant mishra": "sushant mishra",
          "suthar": "manav suthar",
          "suyash sharma": "suyash sharma",
          "swapnil singh": "swapnil singh",
          "t banton": "tom banton",
          "t boult": "trent boult",
          "t david": "tim david",
          "t deshpande": "tushar deshpande",
          "t head": "travis head",
          "t natarajan": "t natarajan",
          "t seifert": "tim seifert",
          "t singh": "tejasvi singh",
          "t stubbs": "tristan stubbs",
          "t vijay": "tripurana vijay",
          "tarmale": "onkar tarmale",
          "tejasvi singh": "tejasvi singh",
          "tendulkar": "arjun tendulkar",
          "tewatia": "rahul tewatia",
          "thushara": "nuwan thushara",
          "tilak varma": "n tilak varma",
          "tim david": "tim david",
          "tim seifert": "tim seifert",
          "tom banton": "tom banton",
          "travis head": "travis head",
          "trent boult": "trent boult",
          "tripathi": "rahul tripathi",
          "tripurana vijay": "tripurana vijay",
          "tristan stubbs": "tristan stubbs",
          "tushar deshpande": "tushar deshpande",
          "tyagi": "kartik tyagi",
          "u malik": "umran malik",
          "u patel": "urvil patel",
          "umran malik": "umran malik",
          "unadkat": "jaydev unadkat",
          "urvil patel": "urvil patel",
          "v arora": "vaibhav arora",
          "v chakaravarthy": "varun chakaravarthy",
          "v iyer": "venkatesh iyer",
          "v kohli": "virat kohli",
          "v malhotra": "vihaan malhotra",
          "v nigam": "vipraj nigam",
          "v nishad": "vishal nishad",
          "v ostwal": "vicky ostwal",
          "v puthur": "vignesh puthur",
          "v suryavanshi": "vaibhav suryavanshi",
          "v vijaykumar": "vyshak vijaykumar",
          "v vinod": "vishnu vinod",
          "vaibhav arora": "vaibhav arora",
          "vaibhav sooryavanshi": "vaibhav suryavanshi",
          "vaibhav suryavanshi": "vaibhav suryavanshi",
          "varma": "n tilak varma",
          "varun chakaravarthy": "varun chakaravarthy",
          "varun chakravarthy": "varun chakaravarthy",
          "veer": "prashant veer",
          "venkatesh iyer": "venkatesh iyer",
          "verma": "aniket verma",
          "vicky ostwal": "vicky ostwal",
          "vignesh puthur": "vignesh puthur",
          "vihaan malhotra": "vihaan malhotra",
          "vijay": "tripurana vijay",
          "vijaykumar": "vyshak vijaykumar",
          "vinod": "vishnu vinod",
          "vipraj nigam": "vipraj nigam",
          "virat kohli": "virat kohli",
          "vishal nishad": "vishal nishad",
          "vishnu vinod": "vishnu vinod",
          "vyshak vijaykumar": "vyshak vijaykumar",
          "w hasaranga": "wanindu hasaranga",
          "w jacks": "will jacks",
          "w sundar": "washington sundar",
          "wadhera": "nehal wadhera",
          "wanindu hasaranga": "wanindu hasaranga",
          "washington sundar": "washington sundar",
          "will jacks": "will jacks",
          "wood": "luke wood",
          "x bartlett": "xavier bartlett",
          "xavier bartlett": "xavier bartlett",
          "y chahal": "yuzvendra chahal",
          "y dayal": "yash dayal",
          "y jaiswal": "yashasvi jaiswal",
          "y r punja": "yash raj punja",
          "y s charak": "yudhvir singh charak",
          "y thakur": "yash thakur",
          "yash dayal": "yash dayal",
          "yash punja": "yash raj punja",
          "yash raj punja": "yash raj punja",
          "yash thakur": "yash thakur",
          "yashasvi jaiswal": "yashasvi jaiswal",
          "yr punja": "yash raj punja",
          "ys charak": "yudhvir singh charak",
          "yudhvir charak": "yudhvir singh charak",
          "yudhvir singh charak": "yudhvir singh charak",
          "yuzvendra chahal": "yuzvendra chahal",
          "z ansari": "zeeshan ansari",
          "z foulkes": "zak foulkes",
          "zak foulkes": "zak foulkes",
          "zeeshan ansari": "zeeshan ansari"
    };
    function normalizeName(v){
      return String(v || '')
        .toLowerCase()
        .replace(/&/g,'and')
        .replace(/[^\w\s]/g,' ')
        .replace(/\s+/g,' ')
        .trim();
    }

    function canonicalCompareName(v){
      const normalized = normalizeName(v);
      return PLAYER_NAME_ALIASES[normalized] || TEAM_NAME_ALIASES[normalized] || normalized;
    }

    function matchesPick(a,b){
      return canonicalCompareName(a) === canonicalCompareName(b);
    }

    function rankOf(pick, ranking){
      const idx = ranking.findIndex(name => matchesPick(name, pick));
      return idx >= 0 ? idx + 1 : null;
    }

    function trackingRankingForLive(live){
      const extended = Array.isArray(live?.extendedRanking) ? live.extendedRanking : [];
      if (extended.length) return extended;
      return Array.isArray(live?.ranking) ? live.ranking : [];
    }

    function describePickLiveState(category, pick, live, explicitRank){
      const trackingRanking = trackingRankingForLive(live);
      const rank = explicitRank || (trackingRanking.length ? rankOf(pick, trackingRanking) : null);

      if (category.type === 'title') {
        if (live?.winner && matchesPick(pick, live.winner)) return 'Live: winner';
        if (Array.isArray(live?.finalists) && live.finalists.some(name => matchesPick(name, pick))) return 'Live: finalist';
        if (Array.isArray(live?.playoffs) && live.playoffs.some(name => matchesPick(name, pick))) return 'Live: playoffs';
        if (rank) return `Live: #${rank}`;
        const hasTitleBoard = Boolean(live?.winner) || (Array.isArray(live?.finalists) && live.finalists.length) || (Array.isArray(live?.playoffs) && live.playoffs.length) || trackingRanking.length;
        return hasTitleBoard ? 'Live: outside frame' : 'Live: waiting';
      }

      if (rank) return `Live: #${rank}`;

      if ((category.type === 'winner' || category.type === 'winner_better') && live?.winner) {
        return matchesPick(pick, live.winner) ? 'Live: current leader' : 'Live: trailing';
      }

      return trackingRanking.length ? 'Live: unranked' : 'Live: waiting';
    }


    function getAggregates(){
      return LIVE_2026?.meta?.aggregates || {};
    }

    function findMatchingKeyInObject(obj, pick){
      const source = obj && typeof obj === 'object' ? obj : {};
      return Object.keys(source).find(name => matchesPick(name, pick)) || null;
    }

    function valueForPickFromObject(obj, pick, nestedKey = null){
      const key = findMatchingKeyInObject(obj, pick);
      if (!key) return null;
      const value = obj[key];
      if (nestedKey && value && typeof value === 'object') {
        return value[nestedKey] ?? null;
      }
      return value;
    }

    function unitLabel(unit, amount){
      return `${amount} ${unit}${Math.abs(amount) === 1 ? '' : 's'}`;
    }

    function oversLabelFromBalls(balls){
      const whole = Math.floor(balls / 6);
      const remainder = balls % 6;
      return remainder ? `${whole}.${remainder} overs` : `${whole} overs`;
    }

    function categoryValueConfig(categoryKey){
      const agg = getAggregates();
      switch (categoryKey) {
        case 'orangeCap': return { map: agg.battingRuns || {}, unit: 'run', minInteresting: 1 };
        case 'mostSixes': return { map: agg.battingSixes || {}, unit: 'six', minInteresting: 1 };
        case 'purpleCap': return { map: agg.bowlingWickets || {}, unit: 'wicket', minInteresting: 1 };
        case 'mostDots': return { map: LIVE_2026?.mostDots?.values || agg.bowlingDots || {}, unit: 'dot ball', minInteresting: 1 };
        case 'mostCatches': return { map: agg.catches || {}, unit: 'catch', minInteresting: 1 };
        case 'mvp': return { map: LIVE_2026?.mvp?.values || {}, unit: 'MVP point', nestedKey: 'score', minInteresting: 1 };
        case 'uncappedMvp': return { map: LIVE_2026?.mvp?.values || {}, unit: 'MVP point', nestedKey: 'score', minInteresting: 1 };
        case 'leastMvp': return { map: LIVE_2026?.mvp?.values || {}, unit: 'MVP point', nestedKey: 'score', minInteresting: 1 };
        default: return { map: {}, unit: 'point', minInteresting: 1 };
      }
    }

    function numericCategoryValue(categoryKey, pick){
      const config = categoryValueConfig(categoryKey);
      const raw = valueForPickFromObject(config.map, pick, config.nestedKey || null);
      if (raw === null || raw === undefined || raw === '') return null;
      const num = Number(raw);
      return Number.isFinite(num) ? num : null;
    }

    function buildClosestContestInsight(rows){
      const candidates = [];
      for (const row of rows) {
        const live = LIVE_2026[row.category.key] || {};
        const ranking = trackingRankingForLive(live);
        const rankA = rankOf(row.pickA, ranking);
        const rankB = rankOf(row.pickB, ranking);
        if (rankA && rankB) {
          candidates.push({
            weight: Math.abs(rankA - rankB),
            message: `Closest duel: ${row.category.label} is still alive — ${row.pickA} sits #${rankA} and ${row.pickB} #${rankB}. One sharp match swings the bragging rights.`
          });
          continue;
        }

        const valueA = numericCategoryValue(row.category.key, row.pickA);
        const valueB = numericCategoryValue(row.category.key, row.pickB);
        const config = categoryValueConfig(row.category.key);
        if (valueA !== null && valueB !== null && (valueA > 0 || valueB > 0)) {
          const gap = Math.abs(valueA - valueB);
          if (gap <= 20) {
            candidates.push({
              weight: gap + 0.5,
              message: `Closest raw chase: ${row.category.label} — ${row.pickA} has ${valueA}, ${row.pickB} has ${valueB}. That is only ${unitLabel(config.unit, gap)} between them.`
            });
          }
        }
      }
      candidates.sort((a,b) => a.weight - b.weight);
      return candidates[0]?.message || null;
    }

    function buildThresholdPushes(matchup){
      const pushes = [];
      const seen = new Set();
      const top5Categories = ['orangeCap','mostSixes','purpleCap','mostDots','mostCatches','mvp','uncappedMvp'];
      for (const categoryKey of top5Categories) {
        const live = LIVE_2026[categoryKey] || {};
        const ranking = trackingRankingForLive(live);
        if (!ranking.length) continue;
        const config = categoryValueConfig(categoryKey);
        const scoringIndex = Math.min(4, ranking.length - 1);
        const boardIndex = Math.min(9, ranking.length - 1);
        const scoringValue = numericCategoryValue(categoryKey, ranking[scoringIndex]);
        const boardValue = numericCategoryValue(categoryKey, ranking[boardIndex]);
        for (const pick of [matchup.a.picks[categoryKey], matchup.b.picks[categoryKey]]) {
          const key = `${categoryKey}:${pick}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const rank = rankOf(pick, ranking);
          const currentValue = numericCategoryValue(categoryKey, pick);
          if (currentValue === null || currentValue < (config.minInteresting || 1)) continue;
          if (!rank && boardValue !== null && boardValue > currentValue) {
            const need = Math.max(1, boardValue - currentValue + 1);
            pushes.push({ priority: need, message: `${pick} is off the ${CATEGORIES.find(c => c.key === categoryKey)?.label || categoryKey} board for now, but ${unitLabel(config.unit, need)} gets them ranked and makes that front live.` });
          } else if (rank && rank > 5 && scoringValue !== null && scoringValue >= currentValue) {
            const need = Math.max(1, scoringValue - currentValue + 1);
            pushes.push({ priority: need + 5, message: `${pick} is parked at #${rank} for ${CATEGORIES.find(c => c.key === categoryKey)?.label || categoryKey}; ${unitLabel(config.unit, need)} more gets into the scoring zone.` });
          } else if (rank && rank > 1) {
            const leaderValue = numericCategoryValue(categoryKey, ranking[0]);
            if (leaderValue !== null && leaderValue > currentValue) {
              const need = Math.max(1, leaderValue - currentValue);
              if (need <= 20) pushes.push({ priority: need + 10, message: `${pick} is already on the ${CATEGORIES.find(c => c.key === categoryKey)?.label || categoryKey} board at #${rank}; ${unitLabel(config.unit, need)} closes on the leader.` });
            }
          }
        }
      }

      const agg = getAggregates();
      for (const pick of [matchup.a.picks.striker, matchup.b.picks.striker]) {
        const runs = Number(valueForPickFromObject(agg.battingRuns || {}, pick) || 0);
        const rank = rankOf(pick, trackingRankingForLive(LIVE_2026.striker || {}));
        if (!rank && runs < 100) {
          const need = 100 - runs;
          pushes.push({ priority: need + 20, message: `${pick} still needs ${unitLabel('run', need)} just to qualify for Striker, so that category is still loading its drama.` });
        }
      }

      for (const pick of [matchup.a.picks.bestBowlingStrikeRate, matchup.b.picks.bestBowlingStrikeRate]) {
        const balls = Number(valueForPickFromObject(agg.bowlingBalls || {}, pick) || 0);
        const wickets = Number(valueForPickFromObject(agg.bowlingWickets || {}, pick) || 0);
        const rank = rankOf(pick, trackingRankingForLive(LIVE_2026.bestBowlingStrikeRate || {}));
        if (!rank && balls < 72) {
          const need = 72 - balls;
          pushes.push({ priority: need + 25, message: wickets > 0 ? `${pick} needs ${need} more balls (${oversLabelFromBalls(need)}) to qualify for bowling strike rate.` : `${pick} needs ${need} more balls (${oversLabelFromBalls(need)}) and a wicket before bowling strike rate even wakes up.` });
        }
      }

      for (const pick of [matchup.a.picks.leastMvp, matchup.b.picks.leastMvp]) {
        const matches = Number(valueForPickFromObject(agg.playerMatches || {}, pick) || 0);
        const rank = rankOf(pick, trackingRankingForLive(LIVE_2026.leastMvp || {}));
        if (!rank && matches < 5) {
          const need = 5 - matches;
          pushes.push({ priority: need + 15, message: `${pick} still needs ${unitLabel('game', need)} before Least MVP becomes a real battlefield.` });
        }
      }

      pushes.sort((a,b) => a.priority - b.priority);
      return pushes.map(x => x.message);
    }

    function buildSwingPressureInsight(matchup, rows){
      const deadRows = rows.filter(r => r.a === 0 && r.b === 0);
      const vulnerable = deadRows.find(r => /unranked|outside frame/i.test(r.pickALiveState + r.pickBLiveState));
      if (vulnerable) {
        return `Hidden swing: ${vulnerable.category.label} is still 0-0, which means one decent outing from ${vulnerable.pickA} or ${vulnerable.pickB} can suddenly make this board look much less polite.`;
      }
      const swingRows = rows.filter(r => r.a !== r.b).sort((x,y) => Math.abs(y.a-y.b) - Math.abs(x.a-x.b));
      if (swingRows.length) {
        const top = swingRows[0];
        const winner = top.a > top.b ? matchup.a.name : matchup.b.name;
        return `Current pressure point: ${top.category.label} is where ${winner} is doing the most damage right now.`;
      }
      return null;
    }

    function scoreWinnerCategory(pickA, pickB, actualWinner){
      const aWin = actualWinner && matchesPick(pickA, actualWinner);
      const bWin = actualWinner && matchesPick(pickB, actualWinner);
      return {
        a: aWin ? 5 : 0,
        b: bWin ? 5 : 0,
        note: actualWinner ? `Winner: ${actualWinner}` : 'Waiting for result'
      };
    }

    function scoreWinnerBetterCategory(pickA, pickB, live, categoryKey){
      const actualWinner = live?.winner || null;
      const aWin = actualWinner && matchesPick(pickA, actualWinner);
      const bWin = actualWinner && matchesPick(pickB, actualWinner);
      return {
        a: aWin ? 1 : 0,
        b: bWin ? 1 : 0,
        note: winnerBetterNote(categoryKey, live)
      };
    }

    function titleBandScore(pick, live){
      if (live.winner && matchesPick(pick, live.winner)) return 5;
      if (Array.isArray(live.finalists) && live.finalists.some(name => matchesPick(name, pick))) return 3;
      if (Array.isArray(live.playoffs) && live.playoffs.some(name => matchesPick(name, pick))) return 2;
      return 0;
    }

    function titleComparisonRank(pick, live){
      if (live.winner && matchesPick(pick, live.winner)) return 1;
      if (Array.isArray(live.finalists) && live.finalists.some(name => matchesPick(name, pick))) return 2;
      if (Array.isArray(live.playoffs) && live.playoffs.some(name => matchesPick(name, pick))) return 3;

      const extendedRanking = Array.isArray(live.extendedRanking) ? live.extendedRanking : [];
      const extRank = rankOf(pick, extendedRanking);
      if (extRank) return 100 + extRank;

      const ranking = Array.isArray(live.ranking) ? live.ranking : [];
      const rank = rankOf(pick, ranking);
      if (rank) return 200 + rank;

      return null;
    }

    function scoreTitleCategory(pickA, pickB, live){
      const aBand = titleBandScore(pickA, live);
      const bBand = titleBandScore(pickB, live);
      let a = aBand;
      let b = bBand;

      if (aBand === 0 && bBand === 0) {
        const posA = titleComparisonRank(pickA, live);
        const posB = titleComparisonRank(pickB, live);
        if (posA && posB) {
          if (posA < posB) a = 1;
          else if (posB < posA) b = 1;
        } else if (posA && !posB) {
          a = 1;
        } else if (posB && !posA) {
          b = 1;
        }
      }

      const noteParts = [];
      if (live.winner) noteParts.push(`Winner: ${live.winner}`);
      if (Array.isArray(live.finalists) && live.finalists.length) noteParts.push(`Finalists: ${live.finalists.join(', ')}`);
      if (Array.isArray(live.playoffs) && live.playoffs.length) noteParts.push(`Playoffs: ${live.playoffs.join(', ')}`);
      if (!noteParts.length) noteParts.push('Waiting for title race');
      return { a, b, note: noteParts.join(' • ') };
    }

    function top5Points(rank){
      if (rank === 1) return 4;
      if (rank === 2 || rank === 3) return 3;
      if (rank === 4 || rank === 5) return 2;
      return 0;
    }

    function scoreTop5Category(pickA, pickB, ranking){
      const rA = rankOf(pickA, ranking);
      const rB = rankOf(pickB, ranking);

      let a = top5Points(rA);
      let b = top5Points(rB);
      let note = 'Waiting for leaderboard';
      if (ranking.length) {
        note = `Top 5: ${ranking.slice(0,5).join(', ')}`;
      }

      // Fallback 1 point applies only if BOTH missed the top 5.
      if (!rA && !rB && ranking.length) {
        // Without a broader season order, both stay at 0 here.
      }

      return { a, b, note, rankA:rA, rankB:rB };
    }

    function scoreTop5WithExtended(pickA, pickB, ranking, extendedRanking){
      const rA = rankOf(pickA, ranking);
      const rB = rankOf(pickB, ranking);
      let a = top5Points(rA);
      let b = top5Points(rB);

      const extA = rankOf(pickA, extendedRanking);
      const extB = rankOf(pickB, extendedRanking);
      const fullA = extA || rA || null;
      const fullB = extB || rB || null;

      // If both missed the top 5, award the 1-point better-prediction fallback.
      // This must work symmetrically: any ranked pick beats an unranked pick,
      // and if both are ranked outside the scoring zone, the closer rank wins.
      if (a === 0 && b === 0) {
        if (fullA && fullB) {
          if (fullA < fullB) a = 1;
          else if (fullB < fullA) b = 1;
        } else if (fullA && !fullB) {
          a = 1;
        } else if (fullB && !fullA) {
          b = 1;
        }
      }

      return {
        a,b,rankA:fullA,rankB:fullB,
        note: ranking.length ? `Top 5: ${ranking.slice(0,5).join(', ')}` : 'Waiting for leaderboard'
      };
    }

    function scoreBetterRankCategory(pickA, pickB, ranking, emptyNote = 'Waiting for ranking'){
      const rA = rankOf(pickA, ranking);
      const rB = rankOf(pickB, ranking);
      let a = 0, b = 0;
      if (rA && rB) {
        if (rA < rB) a = 1;
        else if (rB < rA) b = 1;
      } else if (rA && !rB) {
        a = 1;
      } else if (rB && !rA) {
        b = 1;
      }
      return {
        a, b, rankA:rA, rankB:rB,
        note: ranking.length ? `Top 5: ${ranking.slice(0,5).join(', ')}` : emptyNote
      };
    }

    function scoreBetterRankLowCategory(pickA, pickB, ranking){
      const rA = rankOf(pickA, ranking);
      const rB = rankOf(pickB, ranking);
      let a = 0, b = 0;
      if (rA && rB) {
        if (rA > rB) a = 1;
        else if (rB > rA) b = 1;
      } else if (rA && !rB) {
        a = 1;
      } else if (rB && !rA) {
        b = 1;
      }
      return {
        a, b, rankA:rA, rankB:rB,
        note: ranking.length ? `Lowest 5 eligible: ${ranking.slice(-5).reverse().join(', ')}` : 'Waiting for least-MVP ranking (min 5 games)'
      };
    }

    function getCategoryResult(category, matchup){
      const pickA = matchup.a.picks[category.key];
      const pickB = matchup.b.picks[category.key];
      const live = LIVE_2026[category.key] || {};

      if (category.type === 'title') {
        return scoreTitleCategory(pickA, pickB, live);
      }

      if (category.type === 'winner') {
        return scoreWinnerCategory(pickA, pickB, live.winner || null);
      }

      if (category.type === 'winner_better') {
        return scoreWinnerBetterCategory(pickA, pickB, live, category.key);
      }

      const ranking = Array.isArray(live.ranking) ? live.ranking : [];
      const extendedRanking = Array.isArray(live.extendedRanking) ? live.extendedRanking : null;

      if (category.type === 'better_rank') {
        let emptyNote = 'Waiting for ranking';
        if (category.key === 'striker') emptyNote = 'Waiting for ranking (min 100 runs)';
        if (category.key === 'bestBowlingStrikeRate') emptyNote = 'Waiting for ranking (min 12 overs)';
        return extendedRanking
          ? scoreBetterRankCategory(pickA, pickB, extendedRanking, emptyNote)
          : scoreBetterRankCategory(pickA, pickB, ranking, emptyNote);
      }

      if (category.type === 'better_rank_low') {
        return extendedRanking
          ? scoreBetterRankLowCategory(pickA, pickB, extendedRanking)
          : scoreBetterRankLowCategory(pickA, pickB, ranking);
      }

      return extendedRanking
        ? scoreTop5WithExtended(pickA, pickB, ranking, extendedRanking)
        : scoreTop5Category(pickA, pickB, ranking);
    }

    function computeMatchup(matchup){
      const rows = CATEGORIES.map(category => {
        const result = getCategoryResult(category, matchup);
        const pickA = matchup.a.picks[category.key] || '—';
        const pickB = matchup.b.picks[category.key] || '—';
        const live = LIVE_2026[category.key] || {};
        return {
          category,
          pickA,
          pickB,
          pickALiveState: describePickLiveState(category, pickA, live, result.rankA),
          pickBLiveState: describePickLiveState(category, pickB, live, result.rankB),
          a: result.a,
          b: result.b,
          note: result.note
        };
      });

      const totalA = rows.reduce((s,r)=>s+r.a,0);
      const totalB = rows.reduce((s,r)=>s+r.b,0);

      return { rows, totalA, totalB };
    }

    function topListNote(label, ranking, limit = 5){
      const names = Array.isArray(ranking) ? ranking.slice(0, limit) : [];
      return names.length ? `${label}: ${names.join(', ')}` : `Waiting for ${label.toLowerCase()}`;
    }

    function bottomListNote(label, ranking, limit = 5){
      const names = Array.isArray(ranking) ? ranking.slice(-limit).reverse() : [];
      return names.length ? `${label}: ${names.join(', ')}` : `Waiting for ${label.toLowerCase()}`;
    }

    function winnerBetterNote(categoryKey, live){
      const ranking = Array.isArray(live?.extendedRanking) && live.extendedRanking.length ? live.extendedRanking : (Array.isArray(live?.ranking) ? live.ranking : []);
      if (categoryKey === 'uncappedMvp') return topListNote('Top 5 uncapped MVP', ranking);
      if (categoryKey === 'fairPlay') return topListNote('Top 3 fair play', ranking, 3);
      if (categoryKey === 'highestScoreTeam') return topListNote('Top 5 team scores', ranking);
      if (categoryKey === 'tableBottom') return bottomListNote('Bottom 3', ranking, 3);
      return live?.winner ? `Winner: ${live.winner}` : 'Waiting for result';
    }

    function teamShort(name){
      const map = {
        'Mumbai Indians':'MI',
        'Royal Challengers Bengaluru':'RCB',
        'Chennai Super Kings':'CSK',
        'Sunrisers Hyderabad':'SRH',
        'Gujarat Titans':'GT',
        'Lucknow Super Giants':'LSG',
        'Delhi Capitals':'DC',
        'Punjab Kings':'PBKS',
        'Rajasthan Royals':'RR',
        'Kolkata Knight Riders':'KKR'
      };
      return map[name] || name;
    }

    function formatDate(dt){
      return new Intl.DateTimeFormat(undefined, {
        weekday:'short', day:'numeric', month:'short', hour:'numeric', minute:'2-digit'
      }).format(new Date(dt));
    }

    function formatUtcStamp(iso){
      const dt = new Date(iso);
      const date = dt.toISOString().slice(0, 10);
      const time = dt.toISOString().slice(11, 16);
      return `${date} ${time} UTC`;
    }

    function scheduleRefreshInstants(){
      const offsetsHours = [-1, 4, 5];
      const seen = new Set();
      const points = [];
      for (const match of LEAGUE_STAGE_SCHEDULE) {
        const startMs = Date.parse(match.datetime_utc || match.start || '');
        if (!Number.isFinite(startMs)) continue;
        for (const offsetHours of offsetsHours) {
          const ts = startMs + (offsetHours * 60 * 60 * 1000);
          const key = new Date(ts).toISOString().slice(0, 13);
          if (seen.has(key)) continue;
          seen.add(key);
          points.push(new Date(ts));
        }
      }
      points.sort((a, b) => a - b);
      return points;
    }

    function nextPlannedRefreshMoment(now = new Date()){
      return scheduleRefreshInstants().find(dt => dt.getTime() > now.getTime()) || null;
    }

    function updateNextPlannedRefreshPill(){
      const pill = document.getElementById('nextUpdatePill');
      if (!pill) return;
      const next = nextPlannedRefreshMoment(new Date());
      pill.textContent = next
        ? `Next planned update: ${formatDate(next.toISOString())}`
        : 'Next planned update: league stage completed';
    }

    function currentNextMatch(){
      const nowMs = Date.now();
      return LEAGUE_STAGE_SCHEDULE.find(m => Date.parse(m.datetime_utc || '') > nowMs) || null;
    }

    function scheduleRowStatus(match, nextMatchNo){
      const startMs = Date.parse(match.datetime_utc || '');
      const nowMs = Date.now();
      const endMs = startMs + (5 * 60 * 60 * 1000);
      if (match.match_no === nextMatchNo) return { label: 'Next', cls: 'status-good' };
      if (nowMs >= endMs) return { label: 'Done', cls: 'status-tie' };
      if (nowMs >= startMs && nowMs < endMs) return { label: 'Live window', cls: 'status-good' };
      return { label: 'Upcoming', cls: 'status-bad' };
    }

    async function loadScheduleData(){
      try {
        const cacheBust = `t=${Date.now()}`;
        const res = await fetch(`ipl_2026_schedule.json?${cacheBust}`, {
          cache: 'no-store',
          headers: { 'Accept': 'application/json' }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length) {
          LEAGUE_STAGE_SCHEDULE = data;
        }
      } catch (err) {
        console.warn('Falling back to embedded league schedule', err);
        LEAGUE_STAGE_SCHEDULE = LEAGUE_STAGE_SCHEDULE_FALLBACK.slice();
      }
      updateNextPlannedRefreshPill();
    }


    function escapeHtml(s){
      return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    }

    let activeId = MATCHUPS[0].id;
    let activeView = 'warroom';
    let activeStatsKey = 'orangeCap';

    function renderTabs(){
      const el = document.getElementById('tabs');
      const tabs = [
        ...MATCHUPS.map(m => ({ key: m.id, label: m.label, type: 'matchup' })),
        { key:'stats', label:'Nerd Room', type:'stats' },
        { key:'schedule', label:'Schedule', type:'schedule' }
      ];
      el.innerHTML = tabs.map(t => `
        <button class="tab ${((t.type==='stats' && activeView==='stats') || (t.type==='schedule' && activeView==='schedule') || (t.type==='matchup' && activeView==='warroom' && t.key===activeId)) ? 'active' : ''}" data-key="${t.key}" data-type="${t.type}">${escapeHtml(t.label)}</button>
      `).join('');
      el.querySelectorAll('.tab').forEach(btn => {
        btn.onclick = () => {
          const type = btn.dataset.type;
          const key = btn.dataset.key;
          if (type === 'stats') {
            activeView = 'stats';
          } else if (type === 'schedule') {
            activeView = 'schedule';
          } else {
            activeId = key;
            activeView = 'warroom';
          }
          render();
        };
      });
    }

    function renderViewTabs(){
      const el = document.getElementById('viewTabs');
      if (el) el.innerHTML = '';
    }

    function renderScoreboard(matchup, totalA, totalB){
      const leader =
        totalA === totalB ? 'Dead level. Nobody gets bragging rights yet.'
        : totalA > totalB ? `${matchup.a.name} is ahead by ${totalA-totalB}.`
        : `${matchup.b.name} is ahead by ${totalB-totalA}.`;

      document.getElementById('scoreboard').innerHTML = `
        <div class="player-box">
          <div class="player-name">${escapeHtml(matchup.a.name)}</div>
          <div class="big-score ${totalA>=totalB ? 'lead' : 'trail'}">${totalA}</div>
          <div class="small">Current board pressure: ${totalA>totalB ? 'ahead' : totalA===totalB ? 'level' : 'chasing'}.</div>
        </div>
        <div class="vs">
          VS
          <div class="small" style="margin-top:8px">${escapeHtml(leader)}</div>
        </div>
        <div class="player-box">
          <div class="player-name">${escapeHtml(matchup.b.name)}</div>
          <div class="big-score ${totalB>=totalA ? 'lead' : 'trail'}">${totalB}</div>
          <div class="small">Current board pressure: ${totalB>totalA ? 'ahead' : totalA===totalB ? 'level' : 'chasing'}.</div>
        </div>
      `;
    }

    function renderNextMatch(matchup){
      const next = currentNextMatch();
      const teamsEl = document.getElementById('nextMatchTeams');
      const metaEl = document.getElementById('nextMatchMeta');
      const venueEl = document.getElementById('nextMatchVenue');
      const impactEl = document.getElementById('nextMatchImpact');

      if (!next) {
        teamsEl.textContent = 'No future league fixture in embedded 2026 schedule';
        metaEl.textContent = 'League schedule exhausted or local time is beyond final listed fixture.';
        venueEl.textContent = '';
        impactEl.textContent = 'At this point the bragging rights department becomes fully manual.';
        return;
      }

      const home = teamShort(next.home_team || next.home || '');
      const away = teamShort(next.away_team || next.away || '');

      teamsEl.textContent = `${away} vs ${home}`;
      metaEl.textContent = `Match ${next.match_no || next.matchNo} • ${formatDate(next.datetime_utc || next.start)}`;
      venueEl.textContent = next.venue ? `Venue: ${next.venue}` : formatUtcStamp(next.datetime_utc || next.start);

      const affected = [];
      const watchFor = new Set([
        matchup.a.picks.titleWinner, matchup.b.picks.titleWinner,
        matchup.a.picks.fairPlay, matchup.b.picks.fairPlay,
        matchup.a.picks.highestScoreTeam, matchup.b.picks.highestScoreTeam,
        matchup.a.picks.tableBottom, matchup.b.picks.tableBottom
      ].map(teamShort));

      if (watchFor.has(home) || watchFor.has(away)) affected.push('team-result picks');
      if ([matchup.a.picks.mostSixes, matchup.b.picks.mostSixes].some(v => normalizeName(v).includes('pooran')) && [home,away].includes('LSG')) affected.push('most sixes race');
      if ([matchup.a.picks.orangeCap, matchup.b.picks.orangeCap].some(v => normalizeName(v).includes('rahul')) && [home,away].includes('DC')) affected.push('orange cap race');

      impactEl.textContent = affected.length
        ? `Swing point: this fixture could move ${affected.join(', ')}.`
        : 'Swing point: likely indirect for your picks, so enjoy stress-free scouting for one evening. Briefly.';
    }


    function breakdownRowClass(r){
      if (r.a === r.b) return 'row-tied';
      return r.a > r.b ? 'row-front-a' : 'row-front-b';
    }

    function liveStateTone(state){
      const s = String(state || '').toLowerCase();
      if (/winner|current leader/.test(s)) return 'winner';
      if (/finalist|playoffs/.test(s)) return 'mid';
      if (/unranked/.test(s)) return 'muted';
      if (/trailing|outside frame|outside top|eliminated/.test(s)) return 'down';
      const rankMatch = s.match(/#(\d+)/);
      if (rankMatch) {
        const rank = Number(rankMatch[1]);
        return rank <= 5 ? 'winner' : 'ranked';
      }
      return 'neutral';
    }

    function liveStateHtml(state){
      const text = state || 'Live: waiting';
      return `<span class="live-pill live-${liveStateTone(text)}">${escapeHtml(text)}</span>`;
    }

    function noteTone(note){
      const s = String(note || '').toLowerCase();
      if (!s || /waiting/.test(s)) return 'note-wait';
      if (/bottom 3/.test(s)) return 'note-bottom';
      if (/winner|leader|top 5|top 3 fair play|top 5 uncapped|lowest 5/.test(s)) return 'note-win';
      return 'note-rank';
    }

    function renderBreakdown(matchup, rows){
      const table = document.getElementById('breakdownTable');
      table.innerHTML = `
        <thead>
          <tr>
            <th>Category</th>
            <th>${escapeHtml(matchup.a.name)}</th>
            <th>${escapeHtml(matchup.b.name)}</th>
            <th>Score</th>
            <th>Front</th>
            <th>Live state</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr class="${breakdownRowClass(r)}">
              <td class="category-col"><strong class="category-main">${escapeHtml(r.category.label)}</strong><div class="small">${
                r.category.type === 'top5' ? 'Top-5 scoring category'
                : r.category.type === 'better_rank_low' ? 'Better prediction category (lower rank wins)'
                : r.category.type === 'better_rank' ? 'Better prediction category'
                : 'Winner-takes-points category'
              }</div></td>
              <td><div class="pick-card"><span class="pick-name">${escapeHtml(r.pickA)}</span>${liveStateHtml(r.pickALiveState || 'Live: waiting')}</div></td>
              <td><div class="pick-card"><span class="pick-name">${escapeHtml(r.pickB)}</span>${liveStateHtml(r.pickBLiveState || 'Live: waiting')}</div></td>
              <td class="mono score-cell"><div class="score-stack"><span class="score-num">${r.a}</span><span class="score-dash">-</span><span class="score-num">${r.b}</span></div></td>
              <td>${r.a===r.b ? '<span class="status-chip status-tie">Tied</span>' : r.a>r.b ? `<span class="status-chip status-good">${escapeHtml(matchup.a.name)}</span>` : `<span class="status-chip status-bad">${escapeHtml(matchup.b.name)}</span>`}</td>
              <td class="small"><span class="note-box ${noteTone(r.note)}">${escapeHtml(r.note)}</span></td>
            </tr>
          `).join('')}
        </tbody>
      `;
    }

    function pushUniqueMessage(list, text){
      if (text && !list.includes(text)) list.push(text);
    }

    function buildClosestBattleMessage(rows){
      const ranked = [];
      const numeric = [];
      for (const row of rows) {
        const live = LIVE_2026[row.category.key] || {};
        const ranking = trackingRankingForLive(live);
        const rankA = rankOf(row.pickA, ranking);
        const rankB = rankOf(row.pickB, ranking);
        if (rankA && rankB) {
          ranked.push({
            delta: Math.abs(rankA - rankB),
            msg: `Closest live duel: ${row.category.label} is basically one good night away from mutiny — ${row.pickA} is #${rankA}, ${row.pickB} is #${rankB}.`
          });
          continue;
        }
        const valueA = numericCategoryValue(row.category.key, row.pickA);
        const valueB = numericCategoryValue(row.category.key, row.pickB);
        const config = categoryValueConfig(row.category.key);
        if (valueA !== null && valueB !== null && (valueA > 0 || valueB > 0)) {
          const gap = Math.abs(valueA - valueB);
          numeric.push({
            delta: gap,
            msg: `Tightest raw chase: ${row.category.label} has ${row.pickA} on ${valueA} and ${row.pickB} on ${valueB}. That is only ${unitLabel(config.unit, Math.max(1, gap))} between them.`
          });
        }
      }
      ranked.sort((a,b) => a.delta - b.delta);
      numeric.sort((a,b) => a.delta - b.delta);
      return ranked[0]?.msg || numeric[0]?.msg || null;
    }

    function buildDamageReportMessage(matchup, rows){
      const swingRows = rows.filter(r => r.a !== r.b).sort((x,y) => Math.abs(y.a-y.b) - Math.abs(x.a-x.b));
      if (!swingRows.length) return 'Everything is still level, which means the board is calm only because chaos has not chosen a victim yet.';
      const top = swingRows[0];
      const winner = top.a > top.b ? matchup.a.name : matchup.b.name;
      const liveState = top.a > top.b ? top.pickALiveState : top.pickBLiveState;
      const pick = top.a > top.b ? top.pickA : top.pickB;
      return `Current damage report: ${winner} is making the cleanest hit in ${top.category.label} — ${pick} is ${String(liveState || 'live').replace(/^Live:\s*/i,'').toLowerCase()}.`;
    }

    function buildQualificationWatchMessages(matchup){
      const messages = [];
      try {
        const pushes = buildThresholdPushes(matchup).slice(0, 3);
        pushes.forEach(msg => pushUniqueMessage(messages, `Qualification watch: ${msg}`));
      } catch (_err) {}

      const agg = getAggregates();
      for (const pick of [matchup.a.picks.striker, matchup.b.picks.striker]) {
        const runs = Number(valueForPickFromObject(agg.battingRuns || {}, pick) || 0);
        if (runs > 0 && runs < 100) {
          pushUniqueMessage(messages, `Threshold radar: ${pick} is on ${runs} runs, so ${100 - runs} more unlocks Striker and immediately changes that lane from theory to scoring threat.`);
        }
      }

      for (const pick of [matchup.a.picks.leastMvp, matchup.b.picks.leastMvp]) {
        const matches = Number(valueForPickFromObject(agg.playerMatches || {}, pick) || 0);
        if (matches < 5) {
          pushUniqueMessage(messages, `Eligibility watch: ${pick} has only ${matches} game${matches===1?'':'s'} logged; Least MVP does not become legal until they hit 5.`);
        }
      }

      return messages;
    }

    function buildHiddenSwingMessage(matchup, rows){
      const sleeper = rows.find(r => r.a === 0 && r.b === 0 && (/unranked|outside frame|waiting/i.test((r.pickALiveState || '') + ' ' + (r.pickBLiveState || ''))));
      if (sleeper) {
        return `Hidden swing: ${sleeper.category.label} still sits 0-0, which is dangerous because one decent outing from ${sleeper.pickA} or ${sleeper.pickB} can turn polite silence into point theft.`;
      }
      const deadRows = rows.filter(r => r.a === 0 && r.b === 0).length;
      return deadRows ? `${deadRows} categories are still sleeping at 0-0. That is not dead space; that is unused ammunition.` : null;
    }

    function buildBestLivePickMessage(matchup, rows){
      const rankedStates = rows.flatMap(r => [
        { owner: matchup.a.name, pick: r.pickA, state: r.pickALiveState, category: r.category.label },
        { owner: matchup.b.name, pick: r.pickB, state: r.pickBLiveState, category: r.category.label }
      ]).filter(x => /#\d+|winner|leader|finalist/i.test(x.state || ''));

      if (!rankedStates.length) return null;

      rankedStates.sort((x, y) => {
        const rx = Number((x.state || '').match(/#(\d+)/)?.[1] || 999);
        const ry = Number((y.state || '').match(/#(\d+)/)?.[1] || 999);
        return rx - ry;
      });
      const top = rankedStates[0];
      return `Sharpest live pick on the board: ${top.owner}'s ${top.pick} in ${top.category} is ${String(top.state || '').replace(/^Live:\s*/i,'').toLowerCase()}, which is doing real work already.`;
    }

    function renderInsights(matchup, rows, totalA, totalB){
      const list = [];
      try {
        const leader = totalA === totalB ? null : totalA > totalB ? matchup.a.name : matchup.b.name;
        const margin = Math.abs(totalA - totalB);
        const frontsA = rows.filter(r => r.a > r.b).length;
        const frontsB = rows.filter(r => r.b > r.a).length;
        const unresolved = rows.filter(r => r.a === 0 && r.b === 0).length;

        pushUniqueMessage(list,
          leader
            ? `${leader} leads by ${margin} point${margin === 1 ? '' : 's'}, but the fronts split is only ${frontsA}-${frontsB}. This board is still one hot match away from changing tone completely.`
            : `Dead level overall. Both sides currently own the same amount of swagger and the same amount of exposure.`
        );

        pushUniqueMessage(list, buildClosestBattleMessage(rows));
        pushUniqueMessage(list, buildDamageReportMessage(matchup, rows));

        for (const msg of buildQualificationWatchMessages(matchup)) {
          pushUniqueMessage(list, msg);
        }

        pushUniqueMessage(list, buildHiddenSwingMessage(matchup, rows));
        pushUniqueMessage(list, buildBestLivePickMessage(matchup, rows));

        if (unresolved > 0) {
          pushUniqueMessage(list, `Board texture: ${unresolved} categories are unresolved, so the scoreboard looks settled only if you stop reading after the first line.`);
        }
      } catch (err) {
        console.error('Insights render failed', err);
      }

      const fallback = [
        `${matchup.a.name} has ${rows.filter(r => r.a > r.b).length} fronts, ${matchup.b.name} has ${rows.filter(r => r.b > r.a).length}. The scoreboard and the category map are not always the same story.`,
        `The most dangerous categories are usually the quiet ones — the 0-0 lanes become lethal the moment one pick finally appears on a live board.`,
        `This board is still young enough that one player climbing from unranked to top five can vandalise the whole mood in a single evening.`
      ];
      fallback.forEach(msg => pushUniqueMessage(list, msg));

      document.getElementById('insights').innerHTML = list.slice(0, 5).map(x => `<div class="insight">${escapeHtml(x)}</div>`).join('');
    }

    function renderRoasts(matchup, rows, totalA, totalB){
      const a = matchup.a.name, b = matchup.b.name;
      const margin = Math.abs(totalA - totalB);
      const leader = totalA === totalB ? null : totalA > totalB ? a : b;
      const loser = totalA === totalB ? null : totalA > totalB ? b : a;
      const losingRows = totalA === totalB ? [] : rows.filter(r => leader === a ? r.b > r.a : r.a > r.b).sort((x, y) => Math.abs((leader === a ? y.b - y.a : y.a - y.b)) - Math.abs((leader === a ? x.b - x.a : x.a - x.b)));
      const worstRow = losingRows[0] || rows.find(r => /unranked|waiting|outside frame/i.test(((leader === a ? r.pickBLiveState : r.pickALiveState) || '')));
      const worstPick = worstRow ? (leader === a ? worstRow.pickB : worstRow.pickA) : null;
      const worstState = worstRow ? (leader === a ? worstRow.pickBLiveState : worstRow.pickALiveState) : null;

      let banterLines;
      let extremeLines;

      if (totalA === totalB) {
        banterLines = [
          `${a} and ${b} are level. At the moment this rivalry is two TED Talks sharing one scoreboard.`,
          `Both sides are still talking like visionaries. The numbers are politely asking for evidence.`,
          `Right now the board is tied, which is cricket's way of saying both prediction sheets are still on probation.`
        ];
        extremeLines = [
          `${a} and ${b} are tied because the season has not yet decided which prediction sheet deserves public humiliation first.`,
          `This scoreboard is level only because chaos is still warming up. One bad evening and one of these boards becomes a crime scene.`,
          `Both sides currently have the same score, which is adorable, because confidence-wise they are behaving like they have already won a trophy.`
        ];
      } else {
        banterLines = [
          `${loser} is ${margin} point${margin===1?'':'s'} behind and already practising the phrase “long season” like it is a legal defence.`,
          `${leader} has the board. ${loser} currently has vibes, selective memory, and an optimism package with no warranty.`,
          worstRow ? `${loser}'s softest spot right now is ${worstRow.category.label}: ${worstPick} is ${String(worstState || 'off the board').replace(/^Live:\s*/i,'').toLowerCase()}.` : `${loser}'s sheet is trying hard, but the suspension sounds expensive.`
        ];
        extremeLines = [
          `${leader} brought a scoring plan. ${loser} brought confidence and a prediction sheet with the load-bearing strength of warm papad.`,
          worstRow ? `${loser}'s ${worstRow.category.label} call on ${worstPick} is currently ${String(worstState || 'nowhere').replace(/^Live:\s*/i,'').toLowerCase()}. That is not a pick. That is a missing person bulletin.` : `${loser}'s board currently looks like it was assembled from nostalgia, panic, and one heroic disregard for evidence.`,
          `${leader} is farming points. ${loser} is one press conference away from calling the process more important than the result.`
        ];
      }

      const combined = [
        ...banterLines.map(text => ({ tag: 'Banter', tone: 'banter', text })),
        ...extremeLines.map(text => ({ tag: 'Demolition', tone: 'extreme', text }))
      ];

      document.getElementById('roasts').innerHTML = `<div class="roast-grid">${combined.map(item => `
        <div class="insight roast-item">
          <span class="roast-tag ${item.tone}">${item.tag}</span>
          <span>${escapeHtml(item.text)}</span>
        </div>
      `).join('')}</div>`;
    }

    function playerTeamMap(){
      const map = {};
      const teamFields = ['battingByTeam','bowlingByTeam','fieldingByTeam'];
      for (const field of teamFields) {
        const source = LIVE_2026?.meta?.aggregates?.[field] || {};
        for (const [team, names] of Object.entries(source)) {
          for (const name of Object.keys(names || {})) map[canonicalCompareName(name)] = team;
        }
      }
      return map;
    }

    function standingNrrValue(s){
      const oversFor = Number(s?.ballsFaced || 0) / 6;
      const oversAgainst = Number(s?.ballsBowled || 0) / 6;
      if (!oversFor || !oversAgainst) return 0;
      return ((Number(s?.runsFor || 0) / oversFor) - (Number(s?.runsAgainst || 0) / oversAgainst));
    }

    function mvpContextLine(obj){
      if (!obj || typeof obj !== 'object') return '—';
      return `Runs ${obj.runs || 0} • 6s ${obj.sixes || 0} • Wkts ${obj.wickets || 0} • Dots ${obj.dotBalls || 0} • Catches ${obj.catches || 0}`;
    }

    function statsRowsFor(categoryKey){
      const live = LIVE_2026?.[categoryKey] || {};
      const agg = getAggregates();
      const teamsByPlayer = playerTeamMap();
      const ext = Array.isArray(live.extendedRanking) && live.extendedRanking.length ? live.extendedRanking : (Array.isArray(live.ranking) ? live.ranking : []);
      const ranking = Array.isArray(ext) ? ext : [];
      const rows = [];

      if (categoryKey === 'titleWinner' || categoryKey === 'tableBottom') {
        const standings = agg.standings || {};
        const ordered = ranking.length ? ranking : Object.keys(standings);
        ordered.forEach((team, idx) => {
          const s = standings[team] || {};
          rows.push({ rank: idx + 1, name: team, value: `${s.points ?? 0} pts`, context: `Played ${s.played ?? 0} • W ${s.wins ?? 0} • L ${s.losses ?? 0} • NRR ${standingNrrValue(s).toFixed(3)}` });
        });
        return { summary: categoryKey === 'titleWinner' ? 'Current title-race order from the live standings.' : 'Current table order. For Bottom of table, the lowest side is the live target.', rows };
      }

      if (categoryKey === 'fairPlay') {
        const values = live.values || {};
        ranking.forEach((team, idx) => rows.push({ rank: idx + 1, name: team, value: values[team] ?? '—', context: live.updatedAt ? `Official feed updated ${live.updatedAt}` : 'Official fair-play feed' }));
        return { summary: 'Official IPL Fair Play table.', rows };
      }

      if (categoryKey === 'highestScoreTeam') {
        const values = live.values || {};
        ranking.forEach((team, idx) => rows.push({ rank: idx + 1, name: team, value: values[team] ?? '—', context: 'Highest innings total so far' }));
        return { summary: 'Team leaderboard by highest innings total.', rows };
      }

      if (categoryKey === 'bestBowlingFigures') {
        const figures = live.figures || {};
        ranking.forEach((name, idx) => rows.push({ rank: idx + 1, name, value: figures[name] ?? '—', context: teamsByPlayer[canonicalCompareName(name)] || 'Player' }));
        return { summary: 'Best single-spell figures this season.', rows };
      }

      if (categoryKey === 'bestBowlingStrikeRate') {
        const values = live.values || {};
        ranking.forEach((name, idx) => rows.push({ rank: idx + 1, name, value: values[name] ?? '—', context: `${teamsByPlayer[canonicalCompareName(name)] || 'Player'} • min 12 overs` }));
        return { summary: 'Bowling strike rate board for qualified bowlers only.', rows };
      }

      if (categoryKey === 'mvp' || categoryKey === 'uncappedMvp' || categoryKey === 'leastMvp') {
        const values = live.values || {};
        ranking.forEach((name, idx) => {
          const obj = values[name] || {};
          rows.push({ rank: idx + 1, name, value: obj.score ?? '—', context: mvpContextLine(obj) });
        });
        const summary = categoryKey === 'uncappedMvp' ? 'Uncapped-only MVP board.' : categoryKey === 'leastMvp' ? 'Eligible MVP board used for Least MVP (lower is better, minimum 5 games).' : 'Custom MVP board from live.json.';
        return { summary, rows };
      }

      if (categoryKey === 'orangeCap') {
        ranking.forEach((name, idx) => rows.push({ rank: idx + 1, name, value: valueForPickFromObject(agg.battingRuns || {}, name) ?? '—', context: `${teamsByPlayer[canonicalCompareName(name)] || 'Player'} • ${valueForPickFromObject(agg.battingBalls || {}, name) ?? 0} balls • ${valueForPickFromObject(agg.battingSixes || {}, name) ?? 0} sixes` }));
        return { summary: 'Complete Orange Cap board from live data.', rows };
      }

      if (categoryKey === 'mostSixes') {
        ranking.forEach((name, idx) => rows.push({ rank: idx + 1, name, value: valueForPickFromObject(agg.battingSixes || {}, name) ?? '—', context: `${teamsByPlayer[canonicalCompareName(name)] || 'Player'} • ${valueForPickFromObject(agg.battingRuns || {}, name) ?? 0} runs` }));
        return { summary: 'Full six-hitting board from live data.', rows };
      }

      if (categoryKey === 'purpleCap') {
        ranking.forEach((name, idx) => rows.push({ rank: idx + 1, name, value: valueForPickFromObject(agg.bowlingWickets || {}, name) ?? '—', context: `${teamsByPlayer[canonicalCompareName(name)] || 'Player'} • ${valueForPickFromObject(agg.bowlingBalls || {}, name) ?? 0} balls bowled` }));
        return { summary: 'Full wickets board from live data.', rows };
      }

      if (categoryKey === 'mostDots') {
        const values = live.values || agg.bowlingDots || {};
        ranking.forEach((name, idx) => rows.push({ rank: idx + 1, name, value: values[name] ?? '—', context: `${teamsByPlayer[canonicalCompareName(name)] || 'Player'} • ${valueForPickFromObject(agg.bowlingWickets || {}, name) ?? 0} wickets` }));
        return { summary: 'Dot-ball board from Cricmetric/derived live feed.', rows };
      }

      if (categoryKey === 'striker') {
        ranking.forEach((name, idx) => {
          const runs = Number(valueForPickFromObject(agg.battingRuns || {}, name) || 0);
          const balls = Number(valueForPickFromObject(agg.battingBalls || {}, name) || 0);
          const sr = balls ? ((100 * runs) / balls).toFixed(2) : '—';
          rows.push({ rank: idx + 1, name, value: sr, context: `${teamsByPlayer[canonicalCompareName(name)] || 'Player'} • ${runs} runs from ${balls} balls` });
        });
        return { summary: 'Qualified striker board (minimum 100 runs).', rows };
      }

      if (categoryKey === 'mostCatches') {
        const values = live.values || agg.catches || {};
        ranking.forEach((name, idx) => rows.push({ rank: idx + 1, name, value: values[name] ?? '—', context: teamsByPlayer[canonicalCompareName(name)] || 'Player' }));
        return { summary: 'Catching leaderboard.', rows };
      }

      ranking.forEach((name, idx) => rows.push({ rank: idx + 1, name, value: '—', context: 'Live board entry' }));
      return { summary: 'Live board from data/live.json.', rows };
    }

    function renderStatsTab(){
      const select = document.getElementById('statsCategorySelect');
      if (!select.dataset.bound) {
        select.innerHTML = CATEGORIES.map(c => `<option value="${c.key}">${escapeHtml(c.label)}</option>`).join('');
        select.value = activeStatsKey;
        select.onchange = () => { activeStatsKey = select.value; renderStatsTab(); };
        select.dataset.bound = '1';
      }
      if (select.value !== activeStatsKey) select.value = activeStatsKey;
      const category = CATEGORIES.find(c => c.key === activeStatsKey) || CATEGORIES[0];
      const data = statsRowsFor(activeStatsKey);
      document.getElementById('statsSummary').textContent = data.summary || `Full ${category.label} board from live.json.`;
      document.getElementById('statsTable').innerHTML = `
        <thead>
          <tr>
            <th>Rank</th>
            <th>${escapeHtml(category.label.includes('award') || activeStatsKey==='fairPlay' || activeStatsKey==='highestScoreTeam' || activeStatsKey==='titleWinner' || activeStatsKey==='tableBottom' ? 'Team / Player' : 'Player / Team')}</th>
            <th>Value</th>
            <th>Context</th>
          </tr>
        </thead>
        <tbody>
          ${data.rows.length ? data.rows.map(r => `
            <tr>
              <td class="rank-col">${escapeHtml(r.rank)}</td>
              <td><strong>${escapeHtml(r.name)}</strong></td>
              <td class="value-col">${escapeHtml(r.value)}</td>
              <td class="context-col">${escapeHtml(r.context)}</td>
            </tr>
          `).join('') : `<tr><td colspan="4" class="small">Waiting for live data in this category.</td></tr>`}
        </tbody>`;
    }


    function renderScheduleTab(){
      const table = document.getElementById('scheduleTable');
      const summary = document.getElementById('scheduleSummary');
      if (!table || !summary) return;

      const next = currentNextMatch();
      const nextMatchNo = next?.match_no || next?.matchNo || null;
      const now = new Date();
      const nextRefresh = nextPlannedRefreshMoment(now);
      summary.textContent = nextRefresh
        ? `League-stage schedule in UTC, with local browser time alongside it. Next planned update window: ${formatDate(nextRefresh.toISOString())}.`
        : 'League-stage schedule in UTC, with local browser time alongside it. Refresh windows are complete for the league stage.';

      table.innerHTML = `
        <thead>
          <tr>
            <th>#</th>
            <th>Fixture</th>
            <th>Local time</th>
            <th>UTC</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${LEAGUE_STAGE_SCHEDULE.map(match => {
            const status = scheduleRowStatus(match, nextMatchNo);
            const rowClass = `${match.match_no === nextMatchNo ? 'schedule-row-next' : ''} ${status.label === 'Done' ? 'schedule-row-done' : ''}`.trim();
            return `
              <tr class="${rowClass}">
                <td class="rank-col">#${match.match_no}</td>
                <td><strong>${escapeHtml(match.fixture)}</strong>${match.venue ? `<div class="small">${escapeHtml(match.venue)}</div>` : ''}</td>
                <td class="when-col">${escapeHtml(formatDate(match.datetime_utc))}</td>
                <td class="utc-col">${escapeHtml(formatUtcStamp(match.datetime_utc))}</td>
                <td class="status-col"><span class="status-chip ${status.cls}">${escapeHtml(status.label)}</span></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      `;
    }

    function render(){
      renderTabs();
      renderViewTabs();
      document.getElementById('warRoomSection').classList.toggle('section-hidden', activeView !== 'warroom');
      document.getElementById('statsSection').classList.toggle('section-hidden', activeView !== 'stats');
      document.getElementById('scheduleSection').classList.toggle('section-hidden', activeView !== 'schedule');
      renderStatsTab();
      renderScheduleTab();
      const matchup = MATCHUPS.find(m => m.id === activeId) || MATCHUPS[0];
      const { rows, totalA, totalB } = computeMatchup(matchup);
      renderScoreboard(matchup, totalA, totalB);
      renderNextMatch(matchup);
      renderBreakdown(matchup, rows);
      renderInsights(matchup, rows, totalA, totalB);
      renderRoasts(matchup, rows, totalA, totalB);

      const frontsA = rows.filter(r => r.a > r.b).length;
      const frontsB = rows.filter(r => r.b > r.a).length;
      const confidenceA = Math.max(5, Math.min(95, Math.round(50 + ((totalA-totalB) * 6) + (frontsA-frontsB) * 2)));
      const confidenceB = 100 - confidenceA;
      document.getElementById('metricOverall').textContent = `${totalA} - ${totalB}`;
      document.getElementById('metricFronts').textContent = `${frontsA} - ${frontsB}`;
      document.getElementById('metricLead').textContent = totalA===totalB ? 'Dead level. One good matchday flips it.' : totalA>totalB ? `${matchup.a.name} leads by ${totalA-totalB} point${totalA-totalB===1?'':'s'}.` : `${matchup.b.name} leads by ${totalB-totalA} point${totalB-totalA===1?'':'s'}.`;
      document.getElementById('metricWinner').textContent = totalA===totalB ? 'Too close' : totalA>totalB ? `${matchup.a.name} edge` : `${matchup.b.name} edge`;
      document.getElementById('metricWinnerNote').textContent = totalA===totalB ? 'Still too early for swagger.' : totalA>totalB ? `${matchup.a.name} has the scoreboard and the vibes.` : `${matchup.b.name} has the scoreboard and the vibes.`;
      document.getElementById('metricConfidence').textContent = `${confidenceA}% - ${confidenceB}%`;
      document.getElementById('metricConfidenceNote').textContent = `${matchup.a.name} confidence ${confidenceA}%, ${matchup.b.name} confidence ${confidenceB}%.`;
      const updatedAt = LIVE_2026.fetchedAt ? new Date(LIVE_2026.fetchedAt) : new Date();
      document.getElementById('updatedPill').textContent = `Last updated: ${new Intl.DateTimeFormat(undefined, {dateStyle:'medium', timeStyle:'short'}).format(updatedAt)}`;
      const nextPlannedAtRaw = LIVE_2026?.meta?.scheduler?.nextPlannedRefreshAt;
      const nextUpdatePill = document.getElementById('nextUpdatePill');
      if (nextPlannedAtRaw) {
        const nextPlannedAt = new Date(nextPlannedAtRaw);
        const nextLabel = new Intl.DateTimeFormat(undefined, {dateStyle:'medium', timeStyle:'short'}).format(nextPlannedAt);
        nextUpdatePill.textContent = `Next planned update: ${nextLabel}`;
      } else {
        nextUpdatePill.textContent = 'Next planned update: --';
      }
    }

    function normalizeFetchedLiveData(data){
      const normalized = { ...data };

      if (normalized.highestScoreTeam && !normalized.highestScoreTeam.winner) {
        const ranking = Array.isArray(normalized.highestScoreTeam.ranking) ? normalized.highestScoreTeam.ranking : [];
        if (ranking.length) normalized.highestScoreTeam.winner = ranking[0];
      }

      if (normalized.tableBottom && !normalized.tableBottom.winner) {
        const ranking = Array.isArray(normalized.tableBottom.ranking) ? normalized.tableBottom.ranking : [];
        if (ranking.length) normalized.tableBottom.winner = ranking[ranking.length - 1];
      }

      if (normalized.fairPlay && !normalized.fairPlay.winner) {
        const ranking = Array.isArray(normalized.fairPlay.ranking) ? normalized.fairPlay.ranking : [];
        if (ranking.length) normalized.fairPlay.winner = ranking[0];
      }

      if (normalized.uncappedMvp && !normalized.uncappedMvp.winner) {
        const ranking = Array.isArray(normalized.uncappedMvp.ranking) ? normalized.uncappedMvp.ranking : [];
        if (ranking.length) normalized.uncappedMvp.winner = ranking[0];
      }

      return normalized;
    }

    async function loadLiveData(){
      try {
        const cacheBust = `t=${Date.now()}`;
        const res = await fetch(`data/live.json?${cacheBust}`, {
          cache: 'no-store',
          headers: { 'Accept': 'application/json' }
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch live data: HTTP ${res.status}`);
        }

        const fetched = normalizeFetchedLiveData(await res.json());
        Object.assign(LIVE_2026, fetched);

        const providerBits = [
          fetched.provider || 'data/live.json',
          fetched.scrapeStatus ? `status: ${fetched.scrapeStatus}` : null
        ].filter(Boolean);

        document.getElementById('providerPill').textContent = `Provider: Live / ${providerBits.join(' • ')}`;
      } catch (err) {
        console.error('Live data load failed:', err);
        document.getElementById('providerPill').textContent = 'Provider: Fallback / embedded data';
      }

      render();
    }

    loadScheduleData().finally(() => render());
    loadLiveData();