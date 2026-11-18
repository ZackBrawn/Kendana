import { defineComponent, h } from 'vue';
import { RIcon } from 'roughness';
import * as LucideNodes from 'lucide';

const createRoughIcon = (icon) => defineComponent({
  inheritAttrs: false,
  props: {
    size: { type: [Number, String], default: undefined },
    color: { type: String, default: undefined },
    strokeWidth: { type: [Number, String], default: undefined },
    filled: { type: Boolean, default: false }
  },
  setup(props, { attrs }) {
    return () => h(RIcon, {
      icon,
      filled: props.filled,
      ...attrs,
      style: [
        attrs.style,
        {
          inlineSize: props.size === undefined ? undefined : (typeof props.size === 'number' ? `${props.size}px` : props.size),
          blockSize: props.size === undefined ? undefined : (typeof props.size === 'number' ? `${props.size}px` : props.size),
          '--r-icon-color': props.color || 'currentColor',
          '--r-icon-stroke-width': props.strokeWidth === undefined
            ? undefined
            : (typeof props.strokeWidth === 'number' ? `${props.strokeWidth}px` : props.strokeWidth)
        }
      ]
    });
  }
});

const Lucide = {
  Anchor: createRoughIcon(LucideNodes.Anchor),
  Armchair: createRoughIcon(LucideNodes.Armchair),
  ArrowDownLeft: createRoughIcon(LucideNodes.ArrowDownLeft),
  ArrowLeft: createRoughIcon(LucideNodes.ArrowLeft),
  ArrowLeftRight: createRoughIcon(LucideNodes.ArrowLeftRight),
  ArrowRight: createRoughIcon(LucideNodes.ArrowRight),
  ArrowUpRight: createRoughIcon(LucideNodes.ArrowUpRight),
  Baby: createRoughIcon(LucideNodes.Baby),
  Bandage: createRoughIcon(LucideNodes.Bandage),
  Banknote: createRoughIcon(LucideNodes.Banknote),
  Bed: createRoughIcon(LucideNodes.Bed),
  Beer: createRoughIcon(LucideNodes.Beer),
  Bell: createRoughIcon(LucideNodes.Bell),
  Bike: createRoughIcon(LucideNodes.Bike),
  BookOpen: createRoughIcon(LucideNodes.BookOpen),
  Bot: createRoughIcon(LucideNodes.Bot),
  Brain: createRoughIcon(LucideNodes.Brain),
  Briefcase: createRoughIcon(LucideNodes.Briefcase),
  BriefcaseMedical: createRoughIcon(LucideNodes.BriefcaseMedical),
  Brush: createRoughIcon(LucideNodes.Brush),
  Bus: createRoughIcon(LucideNodes.Bus),
  Calendar: createRoughIcon(LucideNodes.Calendar),
  CalendarDays: createRoughIcon(LucideNodes.CalendarDays),
  Camera: createRoughIcon(LucideNodes.Camera),
  Car: createRoughIcon(LucideNodes.Car),
  CarTaxiFront: createRoughIcon(LucideNodes.CarTaxiFront),
  ChartColumn: createRoughIcon(LucideNodes.ChartColumn),
  ChartLine: createRoughIcon(LucideNodes.ChartLine),
  ChartPie: createRoughIcon(LucideNodes.ChartPie),
  Check: createRoughIcon(LucideNodes.Check),
  ChevronDown: createRoughIcon(LucideNodes.ChevronDown),
  ChevronLeft: createRoughIcon(LucideNodes.ChevronLeft),
  ChevronRight: createRoughIcon(LucideNodes.ChevronRight),
  ChevronUp: createRoughIcon(LucideNodes.ChevronUp),
  Cigarette: createRoughIcon(LucideNodes.Cigarette),
  CircleCheckBig: createRoughIcon(LucideNodes.CircleCheckBig),
  CircleEllipsis: createRoughIcon(LucideNodes.CircleEllipsis),
  CircleHelp: createRoughIcon(LucideNodes.CircleHelp),
  CirclePlay: createRoughIcon(LucideNodes.CirclePlay),
  CircleX: createRoughIcon(LucideNodes.CircleX),
  Clock: createRoughIcon(LucideNodes.Clock),
  Coffee: createRoughIcon(LucideNodes.Coffee),
  Coins: createRoughIcon(LucideNodes.Coins),
  Cookie: createRoughIcon(LucideNodes.Cookie),
  CookingPot: createRoughIcon(LucideNodes.CookingPot),
  CreditCard: createRoughIcon(LucideNodes.CreditCard),
  Crown: createRoughIcon(LucideNodes.Crown),
  Database: createRoughIcon(LucideNodes.Database),
  Delete: createRoughIcon(LucideNodes.Delete),
  Download: createRoughIcon(LucideNodes.Download),
  Drama: createRoughIcon(LucideNodes.Drama),
  Droplet: createRoughIcon(LucideNodes.Droplet),
  Dumbbell: createRoughIcon(LucideNodes.Dumbbell),
  Eye: createRoughIcon(LucideNodes.Eye),
  EyeOff: createRoughIcon(LucideNodes.EyeOff),
  FileText: createRoughIcon(LucideNodes.FileText),
  Film: createRoughIcon(LucideNodes.Film),
  Folder: createRoughIcon(LucideNodes.Folder),
  Fuel: createRoughIcon(LucideNodes.Fuel),
  Gamepad2: createRoughIcon(LucideNodes.Gamepad2),
  Gift: createRoughIcon(LucideNodes.Gift),
  Globe: createRoughIcon(LucideNodes.Globe),
  GraduationCap: createRoughIcon(LucideNodes.GraduationCap),
  Guitar: createRoughIcon(LucideNodes.Guitar),
  HandCoins: createRoughIcon(LucideNodes.HandCoins),
  HandHeart: createRoughIcon(LucideNodes.HandHeart),
  Handshake: createRoughIcon(LucideNodes.Handshake),
  Headphones: createRoughIcon(LucideNodes.Headphones),
  Heart: createRoughIcon(LucideNodes.Heart),
  HeartPulse: createRoughIcon(LucideNodes.HeartPulse),
  Hospital: createRoughIcon(LucideNodes.Hospital),
  House: createRoughIcon(LucideNodes.House),
  IceCreamCone: createRoughIcon(LucideNodes.IceCreamCone),
  Info: createRoughIcon(LucideNodes.Info),
  KeyRound: createRoughIcon(LucideNodes.KeyRound),
  Keyboard: createRoughIcon(LucideNodes.Keyboard),
  Landmark: createRoughIcon(LucideNodes.Landmark),
  Laptop: createRoughIcon(LucideNodes.Laptop),
  Lightbulb: createRoughIcon(LucideNodes.Lightbulb),
  Lock: createRoughIcon(LucideNodes.Lock),
  LogOut: createRoughIcon(LucideNodes.LogOut),
  Mail: createRoughIcon(LucideNodes.Mail),
  MapPin: createRoughIcon(LucideNodes.MapPin),
  MessageCircleMore: createRoughIcon(LucideNodes.MessageCircleMore),
  MessagesSquare: createRoughIcon(LucideNodes.MessagesSquare),
  Moon: createRoughIcon(LucideNodes.Moon),
  Music: createRoughIcon(LucideNodes.Music),
  Notebook: createRoughIcon(LucideNodes.Notebook),
  Package: createRoughIcon(LucideNodes.Package),
  Palette: createRoughIcon(LucideNodes.Palette),
  PartyPopper: createRoughIcon(LucideNodes.PartyPopper),
  PawPrint: createRoughIcon(LucideNodes.PawPrint),
  Pencil: createRoughIcon(LucideNodes.Pencil),
  Percent: createRoughIcon(LucideNodes.Percent),
  PiggyBank: createRoughIcon(LucideNodes.PiggyBank),
  Pill: createRoughIcon(LucideNodes.Pill),
  Pizza: createRoughIcon(LucideNodes.Pizza),
  Plane: createRoughIcon(LucideNodes.Plane),
  Plug: createRoughIcon(LucideNodes.Plug),
  Plus: createRoughIcon(LucideNodes.Plus),
  Receipt: createRoughIcon(LucideNodes.Receipt),
  RefreshCw: createRoughIcon(LucideNodes.RefreshCw),
  Sandwich: createRoughIcon(LucideNodes.Sandwich),
  Save: createRoughIcon(LucideNodes.Save),
  Scale: createRoughIcon(LucideNodes.Scale),
  Scissors: createRoughIcon(LucideNodes.Scissors),
  Search: createRoughIcon(LucideNodes.Search),
  Send: createRoughIcon(LucideNodes.Send),
  Settings: createRoughIcon(LucideNodes.Settings),
  ShieldCheck: createRoughIcon(LucideNodes.ShieldCheck),
  Shirt: createRoughIcon(LucideNodes.Shirt),
  ShoppingBag: createRoughIcon(LucideNodes.ShoppingBag),
  ShoppingCart: createRoughIcon(LucideNodes.ShoppingCart),
  Signature: createRoughIcon(LucideNodes.Signature),
  SlidersHorizontal: createRoughIcon(LucideNodes.SlidersHorizontal),
  Smartphone: createRoughIcon(LucideNodes.Smartphone),
  Smile: createRoughIcon(LucideNodes.Smile),
  Soup: createRoughIcon(LucideNodes.Soup),
  Sparkles: createRoughIcon(LucideNodes.Sparkles),
  SquarePen: createRoughIcon(LucideNodes.SquarePen),
  Stamp: createRoughIcon(LucideNodes.Stamp),
  Stethoscope: createRoughIcon(LucideNodes.Stethoscope),
  Store: createRoughIcon(LucideNodes.Store),
  Sun: createRoughIcon(LucideNodes.Sun),
  Syringe: createRoughIcon(LucideNodes.Syringe),
  Tag: createRoughIcon(LucideNodes.Tag),
  Tent: createRoughIcon(LucideNodes.Tent),
  Theater: createRoughIcon(LucideNodes.Theater),
  Thermometer: createRoughIcon(LucideNodes.Thermometer),
  Ticket: createRoughIcon(LucideNodes.Ticket),
  Timer: createRoughIcon(LucideNodes.Timer),
  TrainFront: createRoughIcon(LucideNodes.TrainFront),
  Trash2: createRoughIcon(LucideNodes.Trash2),
  TreePine: createRoughIcon(LucideNodes.TreePine),
  TrendingUp: createRoughIcon(LucideNodes.TrendingUp),
  TriangleAlert: createRoughIcon(LucideNodes.TriangleAlert),
  Trophy: createRoughIcon(LucideNodes.Trophy),
  Truck: createRoughIcon(LucideNodes.Truck),
  Tv: createRoughIcon(LucideNodes.Tv),
  Umbrella: createRoughIcon(LucideNodes.Umbrella),
  User: createRoughIcon(LucideNodes.User),
  Users: createRoughIcon(LucideNodes.Users),
  Utensils: createRoughIcon(LucideNodes.Utensils),
  Vault: createRoughIcon(LucideNodes.Vault),
  Volleyball: createRoughIcon(LucideNodes.Volleyball),
  Wallet: createRoughIcon(LucideNodes.Wallet),
  WandSparkles: createRoughIcon(LucideNodes.WandSparkles),
  Wifi: createRoughIcon(LucideNodes.Wifi),
  WifiOff: createRoughIcon(LucideNodes.WifiOff),
  Wine: createRoughIcon(LucideNodes.Wine),
  Wrench: createRoughIcon(LucideNodes.Wrench),
  X: createRoughIcon(LucideNodes.X),
  Zap: createRoughIcon(LucideNodes.Zap)
};

const {
  Anchor, Armchair, ArrowDownLeft, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, Baby, Bandage, Banknote, Bed, Beer, Bell, Bike, BookOpen, Bot, Brain, Briefcase, BriefcaseMedical, Brush, Bus, Calendar, CalendarDays, Camera, Car, CarTaxiFront, ChartColumn, ChartLine, ChartPie, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Cigarette, CircleCheckBig, CircleEllipsis, CircleHelp, CirclePlay, CircleX, Clock, Coffee, Coins, Cookie, CookingPot, CreditCard, Crown, Database, Delete, Download, Drama, Droplet, Dumbbell, Eye, EyeOff, FileText, Film, Folder, Fuel, Gamepad2, Gift, Globe, GraduationCap, Guitar, HandCoins, HandHeart, Handshake, Headphones, Heart, HeartPulse, Hospital, House, IceCreamCone, Info, KeyRound, Keyboard, Landmark, Laptop, Lightbulb, Lock, LogOut, Mail, MapPin, MessageCircleMore, MessagesSquare, Moon, Music, Notebook, Package, Palette, PartyPopper, PawPrint, Pencil, Percent, PiggyBank, Pill, Pizza, Plane, Plug, Plus, Receipt, RefreshCw, Sandwich, Save, Scale, Scissors, Search, Send, Settings, ShieldCheck, Shirt, ShoppingBag, ShoppingCart, Signature, SlidersHorizontal, Smartphone, Smile, Soup, Sparkles, SquarePen, Stamp, Stethoscope, Store, Sun, Syringe, Tag, Tent, Theater, Thermometer, Ticket, Timer, TrainFront, Trash2, TreePine, TrendingUp, TriangleAlert, Trophy, Truck, Tv, Umbrella, User, Users, Utensils, Vault, Volleyball, Wallet, WandSparkles, Wifi, WifiOff, Wine, Wrench, X, Zap
} = Lucide;

const mapping = {
  PhAirplane: Plane,
  PhAnchor: Anchor,
  PhArmchair: Armchair,
  PhArrowDownLeft: ArrowDownLeft,
  PhArrowLeft: ArrowLeft,
  PhArrowRight: ArrowRight,
  PhArrowUpRight: ArrowUpRight,
  PhArrowsClockwise: RefreshCw,
  PhArrowsLeftRight: ArrowLeftRight,
  PhBaby: Baby,
  PhBackspace: Delete,
  PhBag: ShoppingBag,
  PhBandaids: Bandage,
  PhBank: Landmark,
  PhBarbell: Dumbbell,
  PhBed: Bed,
  PhBeerBottle: Beer,
  PhBell: Bell,
  PhBicycle: Bike,
  PhBookOpen: BookOpen,
  PhBowlFood: Soup,
  PhBrain: Brain,
  PhBriefcase: Briefcase,
  PhBroom: Brush,
  PhBus: Bus,
  PhCalendar: Calendar,
  PhCalendarBlank: Calendar,
  PhCalendarDots: CalendarDays,
  PhCamera: Camera,
  PhCar: Car,
  PhCardholder: CreditCard,
  PhCaretDown: ChevronDown,
  PhCaretLeft: ChevronLeft,
  PhCaretRight: ChevronRight,
  PhCaretUp: ChevronUp,
  PhChartBar: ChartColumn,
  PhChartLine: ChartLine,
  PhChartPieSlice: ChartPie,
  PhChatCircleDots: MessageCircleMore,
  PhChats: MessagesSquare,
  PhCheck: Check,
  PhCheckCircle: CircleCheckBig,
  PhCheers: Beer,
  PhCigarette: Cigarette,
  PhClock: Clock,
  PhCoffee: Coffee,
  PhCoins: Coins,
  PhConfetti: PartyPopper,
  PhCookie: Cookie,
  PhCookingPot: CookingPot,
  PhCreditCard: CreditCard,
  PhCrown: Crown,
  PhDatabase: Database,
  PhDeviceMobile: Smartphone,
  PhDotsThreeCircle: CircleEllipsis,
  PhDownload: Download,
  PhDrop: Droplet,
  PhEnvelope: Mail,
  PhEye: Eye,
  PhEyeSlash: EyeOff,
  PhFaceMask: Drama,
  PhFaders: SlidersHorizontal,
  PhFileText: FileText,
  PhFilmStrip: Film,
  PhFirstAid: BriefcaseMedical,
  PhFloppyDisk: Save,
  PhFolder: Folder,
  PhForkKnife: Utensils,
  PhGameController: Gamepad2,
  PhGasPump: Fuel,
  PhGear: Settings,
  PhGift: Gift,
  PhGlobe: Globe,
  PhGraduationCap: GraduationCap,
  PhGuitar: Guitar,
  PhHamburger: Sandwich,
  PhHandCoins: HandCoins,
  PhHandHeart: HandHeart,
  PhHandshake: Handshake,
  PhHeadphones: Headphones,
  PhHeart: Heart,
  PhHeartbeat: HeartPulse,
  PhHospital: Hospital,
  PhHouse: House,
  PhHouseLine: House,
  PhIceCream: IceCreamCone,
  PhInfo: Info,
  PhKey: KeyRound,
  PhKeyboard: Keyboard,
  PhLaptop: Laptop,
  PhLightbulb: Lightbulb,
  PhLightning: Zap,
  PhLock: Lock,
  PhMagicWand: WandSparkles,
  PhMagnifyingGlass: Search,
  PhMapPin: MapPin,
  PhMaskHappy: Theater,
  PhMoney: Banknote,
  PhMoon: Moon,
  PhMotorcycle: Bike,
  PhMusicNotes: Music,
  PhNotebook: Notebook,
  PhPackage: Package,
  PhPalette: Palette,
  PhPaperPlane: Send,
  PhPaperPlaneRight: Send,
  PhPaperPlaneTilt: Send,
  PhPawPrint: PawPrint,
  PhPencil: Pencil,
  PhPencilSimple: SquarePen,
  PhPercent: Percent,
  PhPiggyBank: PiggyBank,
  PhPill: Pill,
  PhPizza: Pizza,
  PhPlayCircle: CirclePlay,
  PhPlug: Plug,
  PhPlus: Plus,
  PhQuestion: CircleHelp,
  PhReceipt: Receipt,
  PhRobot: Bot,
  PhScales: Scale,
  PhScissors: Scissors,
  PhShieldCheck: ShieldCheck,
  PhShoppingCart: ShoppingCart,
  PhSignOut: LogOut,
  PhSignature: Signature,
  PhSoccerBall: Volleyball,
  PhSparkle: Sparkles,
  PhStamp: Stamp,
  PhStethoscope: Stethoscope,
  PhStorefront: Store,
  PhSun: Sun,
  PhSwap: ArrowLeftRight,
  PhSyringe: Syringe,
  PhTShirt: Shirt,
  PhTag: Tag,
  PhTaxi: CarTaxiFront,
  PhTelevision: Tv,
  PhTent: Tent,
  PhThermometer: Thermometer,
  PhTicket: Ticket,
  PhTimer: Timer,
  PhTooth: Smile,
  PhTrain: TrainFront,
  PhTrash: Trash2,
  PhTrashSimple: Trash2,
  PhTree: TreePine,
  PhTrendUp: TrendingUp,
  PhTrophy: Trophy,
  PhTruck: Truck,
  PhUmbrella: Umbrella,
  PhUser: User,
  PhUsers: Users,
  PhVault: Vault,
  PhWallet: Wallet,
  PhWarning: TriangleAlert,
  PhWifiHigh: Wifi,
  PhWifiSlash: WifiOff,
  PhWine: Wine,
  PhWrench: Wrench,
  PhX: X,
  PhXCircle: CircleX,
};

// Nama Lucide asli juga bisa dipakai (icon baru cukup ada di Lucide).
export const IconMap = { ...mapping, ...Lucide };

// Nama legacy Phosphor, dipakai resolveIcon() untuk data lama di DB.
export const PhosphorIconMap = mapping;

export const PhAirplane = Plane;
export const PhAnchor = Anchor;
export const PhArmchair = Armchair;
export const PhArrowDownLeft = ArrowDownLeft;
export const PhArrowLeft = ArrowLeft;
export const PhArrowRight = ArrowRight;
export const PhArrowUpRight = ArrowUpRight;
export const PhArrowsClockwise = RefreshCw;
export const PhArrowsLeftRight = ArrowLeftRight;
export const PhBaby = Baby;
export const PhBackspace = Delete;
export const PhBag = ShoppingBag;
export const PhBandaids = Bandage;
export const PhBank = Landmark;
export const PhBarbell = Dumbbell;
export const PhBed = Bed;
export const PhBeerBottle = Beer;
export const PhBell = Bell;
export const PhBicycle = Bike;
export const PhBookOpen = BookOpen;
export const PhBowlFood = Soup;
export const PhBrain = Brain;
export const PhBriefcase = Briefcase;
export const PhBroom = Brush;
export const PhBus = Bus;
export const PhCalendar = Calendar;
export const PhCalendarBlank = Calendar;
export const PhCalendarDots = CalendarDays;
export const PhCamera = Camera;
export const PhCar = Car;
export const PhCardholder = CreditCard;
export const PhCaretDown = ChevronDown;
export const PhCaretLeft = ChevronLeft;
export const PhCaretRight = ChevronRight;
export const PhCaretUp = ChevronUp;
export const PhChartBar = ChartColumn;
export const PhChartLine = ChartLine;
export const PhChartPieSlice = ChartPie;
export const PhChatCircleDots = MessageCircleMore;
export const PhChats = MessagesSquare;
export const PhCheck = Check;
export const PhCheckCircle = CircleCheckBig;
export const PhCheers = Beer;
export const PhCigarette = Cigarette;
export const PhClock = Clock;
export const PhCoffee = Coffee;
export const PhCoins = Coins;
export const PhConfetti = PartyPopper;
export const PhCookie = Cookie;
export const PhCookingPot = CookingPot;
export const PhCreditCard = CreditCard;
export const PhCrown = Crown;
export const PhDatabase = Database;
export const PhDeviceMobile = Smartphone;
export const PhDotsThreeCircle = CircleEllipsis;
export const PhDownload = Download;
export const PhDrop = Droplet;
export const PhEnvelope = Mail;
export const PhEye = Eye;
export const PhEyeSlash = EyeOff;
export const PhFaceMask = Drama;
export const PhFaders = SlidersHorizontal;
export const PhFileText = FileText;
export const PhFilmStrip = Film;
export const PhFirstAid = BriefcaseMedical;
export const PhFloppyDisk = Save;
export const PhFolder = Folder;
export const PhForkKnife = Utensils;
export const PhGameController = Gamepad2;
export const PhGasPump = Fuel;
export const PhGear = Settings;
export const PhGift = Gift;
export const PhGlobe = Globe;
export const PhGraduationCap = GraduationCap;
export const PhGuitar = Guitar;
export const PhHamburger = Sandwich;
export const PhHandCoins = HandCoins;
export const PhHandHeart = HandHeart;
export const PhHandshake = Handshake;
export const PhHeadphones = Headphones;
export const PhHeart = Heart;
export const PhHeartbeat = HeartPulse;
export const PhHospital = Hospital;
export const PhHouse = House;
export const PhHouseLine = House;
export const PhIceCream = IceCreamCone;
export const PhInfo = Info;
export const PhKey = KeyRound;
export const PhKeyboard = Keyboard;
export const PhLaptop = Laptop;
export const PhLightbulb = Lightbulb;
export const PhLightning = Zap;
export const PhLock = Lock;
export const PhMagicWand = WandSparkles;
export const PhMagnifyingGlass = Search;
export const PhMapPin = MapPin;
export const PhMaskHappy = Theater;
export const PhMoney = Banknote;
export const PhMoon = Moon;
export const PhMotorcycle = Bike;
export const PhMusicNotes = Music;
export const PhNotebook = Notebook;
export const PhPackage = Package;
export const PhPalette = Palette;
export const PhPaperPlane = Send;
export const PhPaperPlaneRight = Send;
export const PhPaperPlaneTilt = Send;
export const PhPawPrint = PawPrint;
export const PhPencil = Pencil;
export const PhPencilSimple = SquarePen;
export const PhPercent = Percent;
export const PhPiggyBank = PiggyBank;
export const PhPill = Pill;
export const PhPizza = Pizza;
export const PhPlayCircle = CirclePlay;
export const PhPlug = Plug;
export const PhPlus = Plus;
export const PhQuestion = CircleHelp;
export const PhReceipt = Receipt;
export const PhRobot = Bot;
export const PhScales = Scale;
export const PhScissors = Scissors;
export const PhShieldCheck = ShieldCheck;
export const PhShoppingCart = ShoppingCart;
export const PhSignOut = LogOut;
export const PhSignature = Signature;
export const PhSoccerBall = Volleyball;
export const PhSparkle = Sparkles;
export const PhStamp = Stamp;
export const PhStethoscope = Stethoscope;
export const PhStorefront = Store;
export const PhSun = Sun;
export const PhSwap = ArrowLeftRight;
export const PhSyringe = Syringe;
export const PhTShirt = Shirt;
export const PhTag = Tag;
export const PhTaxi = CarTaxiFront;
export const PhTelevision = Tv;
export const PhTent = Tent;
export const PhThermometer = Thermometer;
export const PhTicket = Ticket;
export const PhTimer = Timer;
export const PhTooth = Smile;
export const PhTrain = TrainFront;
export const PhTrash = Trash2;
export const PhTrashSimple = Trash2;
export const PhTree = TreePine;
export const PhTrendUp = TrendingUp;
export const PhTrophy = Trophy;
export const PhTruck = Truck;
export const PhUmbrella = Umbrella;
export const PhUser = User;
export const PhUsers = Users;
export const PhVault = Vault;
export const PhWallet = Wallet;
export const PhWarning = TriangleAlert;
export const PhWifiHigh = Wifi;
export const PhWifiSlash = WifiOff;
export const PhWine = Wine;
export const PhWrench = Wrench;
export const PhX = X;
export const PhXCircle = CircleX;
