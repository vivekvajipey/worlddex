-- Generated SQL to insert usernames into username_pool table
-- Total unique usernames: 1202
-- Source files: claude_names_extended.txt, claude_names_extra.txt, o3_names_2.txt, o3_names_3.txt

-- This query uses ON CONFLICT DO NOTHING to skip any usernames
-- that already exist in the database (like from grok_names.txt)

INSERT INTO username_pool (username) VALUES
  ('abbey'),
  ('abide'),
  ('abyss'),
  ('acre'),
  ('advisor'),
  ('aficionado'),
  ('agent'),
  ('ahumado'),
  ('alder'),
  ('algae'),
  ('amazer'),
  ('amble'),
  ('ambuscade'),
  ('amender'),
  ('amontillado'),
  ('amp'),
  ('anchor'),
  ('ankle'),
  ('anvil'),
  ('apex'),
  ('api'),
  ('apple'),
  ('apricot'),
  ('arcade'),
  ('arch'),
  ('archer'),
  ('armor'),
  ('ash'),
  ('aspen'),
  ('aurum'),
  ('avalokiteshvara'),
  ('avocado'),
  ('awk'),
  ('azure'),
  ('badger'),
  ('bag'),
  ('bagpipe'),
  ('bait'),
  ('balustrade'),
  ('bamboo'),
  ('bananado'),
  ('band'),
  ('bandaranaike'),
  ('barb'),
  ('barbara'),
  ('barge'),
  ('bark'),
  ('barn'),
  ('barricade'),
  ('bash'),
  ('bass'),
  ('bastinade'),
  ('bastinado'),
  ('bat'),
  ('batch'),
  ('bay'),
  ('beacon'),
  ('beagle'),
  ('beak'),
  ('beam'),
  ('beech'),
  ('beef'),
  ('beetle'),
  ('belly'),
  ('belt'),
  ('bend'),
  ('bender'),
  ('berry'),
  ('berryade'),
  ('berth'),
  ('bharatanatyam'),
  ('bilbo'),
  ('bill'),
  ('binder'),
  ('birch'),
  ('biscuit'),
  ('bit'),
  ('bite'),
  ('blazer'),
  ('blender'),
  ('blob'),
  ('block'),
  ('blockade'),
  ('bloop'),
  ('blunder'),
  ('board'),
  ('boat'),
  ('bobble'),
  ('bog'),
  ('boggle'),
  ('bolt'),
  ('boom'),
  ('boost'),
  ('borrow'),
  ('botargo'),
  ('bottle'),
  ('boulder'),
  ('bouncer'),
  ('bounder'),
  ('bow'),
  ('bracer'),
  ('brahmacharya'),
  ('bramble'),
  ('bravo'),
  ('break'),
  ('breast'),
  ('breeze'),
  ('breezer'),
  ('brick'),
  ('brig'),
  ('brigade'),
  ('brimmer'),
  ('bring'),
  ('brook'),
  ('broth'),
  ('brush'),
  ('buffet'),
  ('bulb'),
  ('bumbler'),
  ('bump'),
  ('bunch'),
  ('bungle'),
  ('bus'),
  ('byte'),
  ('bzip'),
  ('cab'),
  ('cabin'),
  ('caboose'),
  ('calendar'),
  ('calf'),
  ('cambara'),
  ('canal'),
  ('canary'),
  ('cancer'),
  ('cane'),
  ('cannonade'),
  ('canoe'),
  ('canyon'),
  ('cap'),
  ('capybara'),
  ('carbonado'),
  ('carbonara'),
  ('cargo'),
  ('carp'),
  ('cart'),
  ('cascade'),
  ('cascara'),
  ('castle'),
  ('catch'),
  ('cavalcade'),
  ('cave'),
  ('cedar'),
  ('cello'),
  ('censor'),
  ('channel'),
  ('char'),
  ('chaser'),
  ('chasm'),
  ('cherry'),
  ('cherryade'),
  ('chest'),
  ('chewy'),
  ('chiffonade'),
  ('chip'),
  ('chisel'),
  ('chmod'),
  ('chunk'),
  ('chutney'),
  ('cinder'),
  ('citrus'),
  ('clam'),
  ('claw'),
  ('climber'),
  ('cling'),
  ('clot'),
  ('clover'),
  ('club'),
  ('clump'),
  ('cluster'),
  ('coal'),
  ('cobweb'),
  ('coconado'),
  ('coconut'),
  ('coffee'),
  ('coil'),
  ('coke'),
  ('colonnade'),
  ('colorado'),
  ('contender'),
  ('coop'),
  ('cop'),
  ('copse'),
  ('coral'),
  ('cord'),
  ('cottage'),
  ('cotton'),
  ('cove'),
  ('cover'),
  ('cpu'),
  ('crab'),
  ('crack'),
  ('craft'),
  ('crayon'),
  ('cream'),
  ('creaser'),
  ('creek'),
  ('creep'),
  ('crest'),
  ('cricket'),
  ('crimple'),
  ('cringe'),
  ('crinkle'),
  ('crown'),
  ('crumble'),
  ('crusade'),
  ('cruzado'),
  ('crypt'),
  ('cucumber'),
  ('cuddle'),
  ('cupcake'),
  ('curl'),
  ('current'),
  ('cut'),
  ('cylinder'),
  ('cymbal'),
  ('dally'),
  ('dancer'),
  ('dandy'),
  ('dangle'),
  ('dapper'),
  ('dart'),
  ('dash'),
  ('date'),
  ('dawdle'),
  ('dawn'),
  ('decade'),
  ('decaf'),
  ('deck'),
  ('defend'),
  ('defender'),
  ('degrade'),
  ('delay'),
  ('dell'),
  ('delta'),
  ('demerara'),
  ('den'),
  ('dent'),
  ('deodara'),
  ('desperado'),
  ('dharmachakra'),
  ('dharmashala'),
  ('dicer'),
  ('diff'),
  ('dimmer'),
  ('dimple'),
  ('ding'),
  ('ditch'),
  ('divisor'),
  ('dns'),
  ('dock'),
  ('dollop'),
  ('dome'),
  ('donut'),
  ('doodlebug'),
  ('dorado'),
  ('dory'),
  ('downgrade'),
  ('draft'),
  ('drag'),
  ('dregs'),
  ('dribble'),
  ('drift'),
  ('driftwood'),
  ('drop'),
  ('dross'),
  ('druid'),
  ('dulcamara'),
  ('dulcimara'),
  ('dust'),
  ('dwell'),
  ('eagle'),
  ('ebb'),
  ('echo'),
  ('eldorado'),
  ('elm'),
  ('embargo'),
  ('embed'),
  ('enfilade'),
  ('escalade'),
  ('escapade'),
  ('esplanade'),
  ('espresso'),
  ('esteem'),
  ('fable'),
  ('facade'),
  ('face'),
  ('fandango'),
  ('fanfaronade'),
  ('fang'),
  ('fargo'),
  ('farrago'),
  ('fault'),
  ('fawn'),
  ('fen'),
  ('fencer'),
  ('fender'),
  ('fern'),
  ('ferry'),
  ('fetch'),
  ('fiber'),
  ('fidalgo'),
  ('fiddle'),
  ('field'),
  ('fig'),
  ('fin'),
  ('find'),
  ('finder'),
  ('fir'),
  ('fish'),
  ('fizz'),
  ('fizzle'),
  ('fjord'),
  ('flake'),
  ('flaw'),
  ('flex'),
  ('flicker'),
  ('fling'),
  ('flint'),
  ('flip'),
  ('flood'),
  ('flounder'),
  ('flow'),
  ('flurry'),
  ('flux'),
  ('foam'),
  ('foamy'),
  ('fold'),
  ('forest'),
  ('fork'),
  ('fort'),
  ('fortify'),
  ('founder'),
  ('fowl'),
  ('frazzle'),
  ('freezer'),
  ('frizzle'),
  ('froth'),
  ('ftp'),
  ('fumble'),
  ('fumbler'),
  ('fusilade'),
  ('gadget'),
  ('galago'),
  ('gamble'),
  ('gap'),
  ('gargle'),
  ('gasconade'),
  ('gash'),
  ('gazebo'),
  ('geezer'),
  ('gender'),
  ('geyser'),
  ('giblet'),
  ('gimbal'),
  ('give'),
  ('glazer'),
  ('glen'),
  ('glider'),
  ('glimmer'),
  ('glitch'),
  ('glob'),
  ('goblet'),
  ('gondwara'),
  ('gopher'),
  ('gorge'),
  ('gourd'),
  ('gpu'),
  ('grab'),
  ('grain'),
  ('grape'),
  ('grapeade'),
  ('grass'),
  ('grave'),
  ('gravel'),
  ('gravy'),
  ('grazer'),
  ('greaser'),
  ('gremlin'),
  ('grenade'),
  ('grenado'),
  ('grep'),
  ('grid'),
  ('grimace'),
  ('grinder'),
  ('grip'),
  ('gristle'),
  ('grocer'),
  ('grounder'),
  ('grounds'),
  ('grove'),
  ('grumble'),
  ('grumbler'),
  ('guadalajara'),
  ('guanabara'),
  ('guard'),
  ('guava'),
  ('gulch'),
  ('gulf'),
  ('gum'),
  ('gumbo'),
  ('gush'),
  ('gzip'),
  ('halt'),
  ('hammock'),
  ('hamster'),
  ('harbor'),
  ('hash'),
  ('hatch'),
  ('haul'),
  ('haven'),
  ('hazel'),
  ('head'),
  ('heap'),
  ('heath'),
  ('heel'),
  ('helium'),
  ('helm'),
  ('herb'),
  ('heron'),
  ('hexagon'),
  ('hidalgo'),
  ('hill'),
  ('hinder'),
  ('hip'),
  ('hold'),
  ('hole'),
  ('holly'),
  ('hoof'),
  ('hook'),
  ('horn'),
  ('html'),
  ('hula'),
  ('hull'),
  ('humble'),
  ('hunk'),
  ('hunt'),
  ('husk'),
  ('hut'),
  ('hutch'),
  ('icer'),
  ('igloo'),
  ('iguana'),
  ('ink'),
  ('inkblot'),
  ('inkwell'),
  ('inlet'),
  ('iris'),
  ('islet'),
  ('isotope'),
  ('ivory'),
  ('ivy'),
  ('jab'),
  ('jack'),
  ('jaguar'),
  ('jangle'),
  ('javelin'),
  ('jelly'),
  ('jerky'),
  ('jester'),
  ('jetty'),
  ('join'),
  ('joule'),
  ('json'),
  ('jubilant'),
  ('juice'),
  ('jumble'),
  ('jumbo'),
  ('jungle'),
  ('juno'),
  ('kaiser'),
  ('kayak'),
  ('keel'),
  ('keep'),
  ('kelp'),
  ('kepler'),
  ('ketch'),
  ('kettle'),
  ('kill'),
  ('kinder'),
  ('king'),
  ('kismet'),
  ('kit'),
  ('kite'),
  ('knee'),
  ('knob'),
  ('knot'),
  ('koala'),
  ('koji'),
  ('krill'),
  ('kumbhakarna')
ON CONFLICT (username) DO NOTHING;

INSERT INTO username_pool (username) VALUES
  ('kumquat'),
  ('lagoon'),
  ('lair'),
  ('lake'),
  ('lamb'),
  ('lance'),
  ('lancer'),
  ('larch'),
  ('largo'),
  ('laser'),
  ('lasso'),
  ('latte'),
  ('lava'),
  ('lavender'),
  ('leaf'),
  ('leaser'),
  ('lees'),
  ('lemonade'),
  ('lemur'),
  ('lend'),
  ('lender'),
  ('lichen'),
  ('lift'),
  ('lilac'),
  ('limber'),
  ('limbo'),
  ('lime'),
  ('limeade'),
  ('linden'),
  ('linger'),
  ('lint'),
  ('lip'),
  ('lizard'),
  ('lock'),
  ('lodge'),
  ('loiter'),
  ('lot'),
  ('lug'),
  ('lump'),
  ('lunar'),
  ('lure'),
  ('lurk'),
  ('lynx'),
  ('macaroon'),
  ('mace'),
  ('magnet'),
  ('mahabharata'),
  ('maharashtrian'),
  ('mail'),
  ('mallow'),
  ('mangle'),
  ('mango'),
  ('mangonado'),
  ('manor'),
  ('manta'),
  ('maple'),
  ('marinade'),
  ('marinara'),
  ('marmalade'),
  ('marsh'),
  ('mascara'),
  ('mash'),
  ('masquerade'),
  ('mast'),
  ('matrix'),
  ('meadow'),
  ('megara'),
  ('melon'),
  ('melonado'),
  ('mender'),
  ('mentor'),
  ('merge'),
  ('mesa'),
  ('mesh'),
  ('meteor'),
  ('metro'),
  ('midge'),
  ('minder'),
  ('minnow'),
  ('mire'),
  ('miser'),
  ('mkdir'),
  ('moat'),
  ('mono'),
  ('monsoon'),
  ('moor'),
  ('morsel'),
  ('moss'),
  ('motorcade'),
  ('mound'),
  ('mount'),
  ('mouth'),
  ('muck'),
  ('mumble'),
  ('mumbler'),
  ('muscovado'),
  ('myrrh'),
  ('nab'),
  ('nail'),
  ('nano'),
  ('napkin'),
  ('narayanastra'),
  ('narwhal'),
  ('nebula'),
  ('neck'),
  ('nectar'),
  ('nectarine'),
  ('neon'),
  ('nest'),
  ('net'),
  ('nettle'),
  ('nexus'),
  ('niagara'),
  ('nicer'),
  ('nick'),
  ('nimble'),
  ('nip'),
  ('nmap'),
  ('node'),
  ('nose'),
  ('notch'),
  ('nozzle'),
  ('nudge'),
  ('nutmeg'),
  ('oak'),
  ('oasis'),
  ('oboe'),
  ('ocelot'),
  ('octant'),
  ('octopus'),
  ('offender'),
  ('officer'),
  ('ohm'),
  ('olive'),
  ('omelet'),
  ('onyx'),
  ('ooze'),
  ('opal'),
  ('opera'),
  ('oracle'),
  ('orangeade'),
  ('orca'),
  ('osmosis'),
  ('oxbow'),
  ('oxygen'),
  ('pacer'),
  ('paddle'),
  ('palace'),
  ('palisade'),
  ('palm'),
  ('panel'),
  ('parade'),
  ('parrot'),
  ('pashupatastra'),
  ('passado'),
  ('paste'),
  ('patch'),
  ('pause'),
  ('paw'),
  ('peach'),
  ('peachade'),
  ('peak'),
  ('pear'),
  ('peat'),
  ('pebble'),
  ('peck'),
  ('pekoe'),
  ('pen'),
  ('peony'),
  ('pepper'),
  ('perch'),
  ('perf'),
  ('perl'),
  ('petal'),
  ('phaser'),
  ('picket'),
  ('pickle'),
  ('piece'),
  ('pigeon'),
  ('pike'),
  ('pile'),
  ('pimple'),
  ('pinch'),
  ('pine'),
  ('ping'),
  ('pintado'),
  ('pinto'),
  ('pipe'),
  ('pippin'),
  ('pit'),
  ('pivot'),
  ('placer'),
  ('plain'),
  ('plane'),
  ('plank'),
  ('plant'),
  ('plate'),
  ('pleaser'),
  ('plink'),
  ('plot'),
  ('plug'),
  ('plum'),
  ('plumber'),
  ('plume'),
  ('plunder'),
  ('plush'),
  ('pogo'),
  ('poke'),
  ('pole'),
  ('polka'),
  ('pompom'),
  ('poncho'),
  ('pond'),
  ('pool'),
  ('popcorn'),
  ('poplar'),
  ('pork'),
  ('port'),
  ('post'),
  ('pounder'),
  ('powder'),
  ('prairie'),
  ('prancer'),
  ('prawn'),
  ('presto'),
  ('pretender'),
  ('pricer'),
  ('prick'),
  ('primer'),
  ('prod'),
  ('promenade'),
  ('protect'),
  ('prowl'),
  ('pull'),
  ('pulp'),
  ('pummel'),
  ('pumpkin'),
  ('punt'),
  ('push'),
  ('quarry'),
  ('quartz'),
  ('quaver'),
  ('qubit'),
  ('quench'),
  ('quest'),
  ('quiche'),
  ('quick'),
  ('quid'),
  ('quiet'),
  ('quill'),
  ('quince'),
  ('quiver'),
  ('quokka'),
  ('rabbit'),
  ('racer'),
  ('radar'),
  ('raft'),
  ('raghunatha'),
  ('ram'),
  ('ramble'),
  ('ramen'),
  ('ranch'),
  ('rascal'),
  ('raven'),
  ('ravine'),
  ('razor'),
  ('reed'),
  ('refuge'),
  ('relic'),
  ('relish'),
  ('remain'),
  ('reminder'),
  ('remoulade'),
  ('render'),
  ('renegade'),
  ('renegado'),
  ('reposado'),
  ('reside'),
  ('rest'),
  ('retrograde'),
  ('rhino'),
  ('rhymer'),
  ('ricer'),
  ('ricotta'),
  ('ridge'),
  ('rift'),
  ('rig'),
  ('ring'),
  ('rip'),
  ('riser'),
  ('river'),
  ('rivet'),
  ('rmdir'),
  ('robin'),
  ('rock'),
  ('rod'),
  ('rodeo'),
  ('rom'),
  ('roost'),
  ('root'),
  ('rope'),
  ('rosie'),
  ('rounder'),
  ('rubble'),
  ('ruby'),
  ('rudder'),
  ('ruffle'),
  ('rumble'),
  ('rune'),
  ('rush'),
  ('rust'),
  ('rustle'),
  ('sable'),
  ('sage'),
  ('sahara'),
  ('sahasranama'),
  ('sail'),
  ('salty'),
  ('samara'),
  ('samba'),
  ('samskaravada'),
  ('sand'),
  ('sandy'),
  ('sankara'),
  ('sapsago'),
  ('sarvadharma'),
  ('satyagraha'),
  ('sauce'),
  ('sayonara'),
  ('scale'),
  ('scone'),
  ('scoop'),
  ('scooter'),
  ('scramble'),
  ('scrap'),
  ('scribble'),
  ('scrub'),
  ('scruff'),
  ('scum'),
  ('sdk'),
  ('seaweed'),
  ('secure'),
  ('sed'),
  ('sedge'),
  ('sediment'),
  ('sender'),
  ('sensor'),
  ('sequin'),
  ('serenade'),
  ('settle'),
  ('shack'),
  ('shamble'),
  ('shankaracharya'),
  ('shed'),
  ('sheep'),
  ('sheet'),
  ('shelter'),
  ('sherbet'),
  ('shield'),
  ('shimmer'),
  ('shimmy'),
  ('shin'),
  ('ship'),
  ('shove'),
  ('shred'),
  ('shrub'),
  ('silky'),
  ('silt'),
  ('simmer'),
  ('simple'),
  ('sing'),
  ('sizzle'),
  ('skandamata'),
  ('skate'),
  ('skiff'),
  ('skimmer'),
  ('skipper'),
  ('skulk'),
  ('slab'),
  ('slag'),
  ('slash'),
  ('slice'),
  ('slicer'),
  ('slime'),
  ('sling'),
  ('slink'),
  ('sliver'),
  ('sloop'),
  ('sloth'),
  ('slurp'),
  ('smidge'),
  ('smirk'),
  ('snack'),
  ('snare'),
  ('snatch'),
  ('sneak'),
  ('sneezer'),
  ('snorkel'),
  ('snout'),
  ('sock'),
  ('socket'),
  ('sole'),
  ('solfatara'),
  ('sonic'),
  ('soot'),
  ('sort'),
  ('sound'),
  ('sounder'),
  ('soup'),
  ('spacer'),
  ('spangle'),
  ('spark'),
  ('spear'),
  ('spencer'),
  ('spender'),
  ('spice'),
  ('spigot'),
  ('spike'),
  ('spin'),
  ('spine'),
  ('spire'),
  ('splash'),
  ('splendor'),
  ('splicer'),
  ('split'),
  ('spoke'),
  ('sponge'),
  ('sprat'),
  ('sprig'),
  ('spring'),
  ('spritz'),
  ('sprout'),
  ('spruce'),
  ('spry'),
  ('spud'),
  ('sql'),
  ('squash'),
  ('squeeze'),
  ('squib'),
  ('squid'),
  ('ssh'),
  ('stack'),
  ('staff'),
  ('stalk'),
  ('stall'),
  ('star'),
  ('stay'),
  ('steal'),
  ('steppe'),
  ('stern'),
  ('stew'),
  ('stick'),
  ('stilts'),
  ('sting'),
  ('stock'),
  ('stockade'),
  ('stone'),
  ('stop'),
  ('strait'),
  ('strand'),
  ('strangle'),
  ('strap'),
  ('strappado'),
  ('stream'),
  ('stretch'),
  ('string'),
  ('strip'),
  ('stumble'),
  ('sty'),
  ('sudo'),
  ('summit'),
  ('sundae'),
  ('surf'),
  ('surge'),
  ('suspender'),
  ('swamp'),
  ('swell'),
  ('swimmer'),
  ('swing'),
  ('swipe'),
  ('swirl'),
  ('swoop'),
  ('sword'),
  ('symbol'),
  ('table'),
  ('taiga'),
  ('tail'),
  ('take'),
  ('talisman'),
  ('talon'),
  ('tamarabara'),
  ('tangerine'),
  ('tangle'),
  ('tango'),
  ('tantara'),
  ('tapenade'),
  ('tapper'),
  ('tar'),
  ('tardy'),
  ('tarp')
ON CONFLICT (username) DO NOTHING;

INSERT INTO username_pool (username) VALUES
  ('tarry'),
  ('taser'),
  ('tathagatagarbha'),
  ('tattvavada'),
  ('taxi'),
  ('tcp'),
  ('teapot'),
  ('tear'),
  ('teaser'),
  ('tempo'),
  ('tender'),
  ('tensor'),
  ('tent'),
  ('terra'),
  ('thicket'),
  ('thigh'),
  ('thimble'),
  ('thimbler'),
  ('thing'),
  ('thorn'),
  ('thread'),
  ('throat'),
  ('throw'),
  ('thunder'),
  ('tiara'),
  ('tidal'),
  ('tide'),
  ('tiger'),
  ('tiller'),
  ('timber'),
  ('timer'),
  ('tinder'),
  ('tinsel'),
  ('tip'),
  ('toast'),
  ('toe'),
  ('tomato'),
  ('tomb'),
  ('tongue'),
  ('tooth'),
  ('top'),
  ('topaz'),
  ('torch'),
  ('tornado'),
  ('toss'),
  ('touch'),
  ('tow'),
  ('tower'),
  ('tracer'),
  ('track'),
  ('trail'),
  ('train'),
  ('tram'),
  ('trap'),
  ('trench'),
  ('trimmer'),
  ('trinket'),
  ('trout'),
  ('truck'),
  ('trunk'),
  ('tuft'),
  ('tumble'),
  ('tuna'),
  ('tundra'),
  ('turf'),
  ('turn'),
  ('tusk'),
  ('tussle'),
  ('tweezer'),
  ('twine'),
  ('twist'),
  ('twitch'),
  ('udder'),
  ('udp'),
  ('ultra'),
  ('umbel'),
  ('umbra'),
  ('ump'),
  ('unicorn'),
  ('uniq'),
  ('upgrade'),
  ('uplift'),
  ('urchin'),
  ('usher'),
  ('utopia'),
  ('vacuum'),
  ('vagabond'),
  ('vale'),
  ('valley'),
  ('van'),
  ('vanaprastha'),
  ('vanilla'),
  ('vanish'),
  ('vault'),
  ('veal'),
  ('velcro'),
  ('vendor'),
  ('venus'),
  ('verge'),
  ('vertex'),
  ('vespa'),
  ('vessel'),
  ('vial'),
  ('vigor'),
  ('villa'),
  ('vim'),
  ('vine'),
  ('visor'),
  ('vista'),
  ('vivid'),
  ('void'),
  ('volt'),
  ('voxel'),
  ('wagtail'),
  ('waist'),
  ('wait'),
  ('wake'),
  ('walnut'),
  ('wand'),
  ('wander'),
  ('wasabi'),
  ('wash'),
  ('watt'),
  ('wave'),
  ('waxwing'),
  ('weasel'),
  ('wedge'),
  ('weed'),
  ('wget'),
  ('wheat'),
  ('wheel'),
  ('whimsy'),
  ('whisker'),
  ('whisper'),
  ('wicket'),
  ('widget'),
  ('wiggle'),
  ('willow'),
  ('wimple'),
  ('winder'),
  ('windy'),
  ('wing'),
  ('wire'),
  ('wisp'),
  ('wobble'),
  ('wobbler'),
  ('wonder'),
  ('wonky'),
  ('woods'),
  ('woofer'),
  ('worm'),
  ('wrangle'),
  ('wrap'),
  ('wrench'),
  ('wring'),
  ('wrinkle'),
  ('xanadu'),
  ('xenia'),
  ('xeno'),
  ('xiphoid'),
  ('xml'),
  ('xtra'),
  ('xylem'),
  ('xylite'),
  ('xylophone'),
  ('yabby'),
  ('yacht'),
  ('yahoo'),
  ('yaml'),
  ('yard'),
  ('yarn'),
  ('yarrow'),
  ('yawl'),
  ('yawn'),
  ('yeti'),
  ('yew'),
  ('yield'),
  ('yip'),
  ('yippy'),
  ('yogachara'),
  ('yolk'),
  ('yonder'),
  ('yucca'),
  ('yurt'),
  ('zap'),
  ('zapateado'),
  ('zarathustra'),
  ('zeal'),
  ('zen'),
  ('zenon'),
  ('zinc'),
  ('zing'),
  ('zip'),
  ('zipper'),
  ('zircon'),
  ('zither'),
  ('zodiac'),
  ('zoodle'),
  ('zoom'),
  ('zsh'),
  ('zucchini'),
  ('zygote')
ON CONFLICT (username) DO NOTHING;

