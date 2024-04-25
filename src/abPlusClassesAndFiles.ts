import { Context } from 'koishi'

const fs = require("fs");
const path = require('path');

const abpPath = './data/1a2bPlusData';

//单个群聊/私聊的游戏状态
class ABPlusSingleStats {
    inGuild: boolean;                            //游戏在群组还是私聊中
    isPlaying: boolean = false;                  //是否正在游戏中
    inToturial: boolean = false;                 //是否正在教程中
    //答案↓
    guessAnswer: Array<string> = ['0', '1', '2', '3'];
    guessStartTime: Date = new Date();           //游戏开始时间
    guessHistory: Array<ABPlusSingleGuess> = []; //本局游戏的猜测历史
    guessTimer: () => void = () => undefined;
    constructor(inGuild:boolean) {
        this.inGuild = inGuild;
    };
}
//单个群聊/私聊的配置
export class ABPlusSingleConfig {
    channelName:string = '?';
    //答案会从这个猜测池中抽取↓
    guessPool:Array<string> = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    guessPoolDescribe:string = '0~9';
    guessLength:number = 4;             //答案的长度
    modeDuplicate:boolean = false;    //是否允许重复
    modeC:boolean = false;            //是否开启C模式
    modeStupid:boolean = false;      //是否开启愚人模式

    constructor(channelName:string) {
        this.channelName = channelName;
    };
}
//单次猜测的内容
export class ABPlusSingleGuess {
    userId: string;
    userName: string;
    guessMessage: string;
    guessResult: any;
    constructor(session: any, message: string, result: any) {
        this.userId = session.userId;
        this.userName = session.event.user.name;
        this.guessMessage = message;
        this.guessResult = result;
    }
}

interface StatsList {
    [key: string]: ABPlusSingleStats;
}

interface ConfigList {
    [key: string]: ABPlusSingleConfig;
}

export class ABPlusTemp {
    statsList:StatsList = {};
    configList:ConfigList = {};

    async getStats(session: any): Promise<ABPlusSingleStats> {
        //如果不存在群聊/私聊数据则建立
        if(!this.statsList[encodeURIComponent(session.channelId)])
            this.statsList[encodeURIComponent(session.channelId)] = new ABPlusSingleStats(!session.event.channel.type);
        return this.statsList[encodeURIComponent(session.channelId)];
    }

    async getConfig(session: any): Promise<ABPlusSingleConfig> {
        // onebot的QQ群聊名称无法用session.guildName获得，只好稍微绕点弯用session.bot.getGuild()获得群聊名
        const channelName = session.event.channel.type ? session.event.user.name : (await session.bot.getGuild(session.guildId)).name;
        //如果不存在群聊/私聊数据则建立
        if(!this.configList[encodeURIComponent(session.channelId)]) {
            this.configList[encodeURIComponent(session.channelId)] = new ABPlusSingleConfig(channelName);
            await this.writeConfig();
        } else {
            this.configList[encodeURIComponent(session.channelId)].channelName = channelName;   //每次都要更新一下名称（写的时候还不知道有群聊改名事件这个东东
            await this.writeConfig();
        }
        return this.configList[encodeURIComponent(session.channelId)];
    }
    //设定某一项配置
    async setConfig(session: any, valueName: string, value: any) {
        const config = await this.getConfig(session);
        const channelName = session.event.channel.type ? session.event.user.name : (await session.bot.getGuild(session.guildId)).name;
        config[valueName] = value;
        config.channelName = channelName;   //更新名称
        await this.writeConfig();
        return this;
    }
    //重置某一项配置
    async reSetConfig(session: any, valueName: string) {
        const config = await this.getConfig(session);
        const channelName = session.event.channel.type? session.event.user.name: (await session.bot.getGuild(session.guildId)).name;
        config[valueName] = (new ABPlusSingleConfig(''))[valueName];
        config.channelName = channelName;   //更新名称
        await this.writeConfig();
        return this;
    }
    //重置全部配置
    async refreshConfig(session: any) {
        const config = await this.getConfig(session);
        const channelName = session.event.channel.type? session.event.user.name: (await session.bot.getGuild(session.guildId)).name;
        Object.assign(config, new ABPlusSingleConfig[channelName]);
        await this.writeConfig();
        return this;
    }

    async readConfig() {
        await readAndUpdate(this.configList,ABPlusSingleConfig,'','/abPlusConfig.json',abpPath);
        return this;
    }

    async writeConfig() {
        await fs.writeFileSync(abpPath + '/abPlusConfig.json', JSON.stringify(this.configList,null,'\t'));
        return this;
    }

    //将配置拼接为字符串（用来做配置排行榜） 如标准模式（字符数量10长度4）会被拼接为"1004falsefalsefalse"
    //好吧其实config里也有个getter其实这个好像没用了...留着吧万一呢
    async session2configText(session: any):Promise<string> {
        const config:ABPlusSingleConfig = await this.getConfig(session);
        const configText:string = await this.config2configText(config);
        return configText;
    }

    async config2configText(config: ABPlusSingleConfig) {
        const configText:string = config.guessPool.length.toString().padStart(2,'0') +
                                  config.guessLength.toString().padStart(2,'0') +
                                  config.modeDuplicate + 
                                  config.modeC +
                                  config.modeStupid;
        return configText;
    }
    //将输入的参数转换为配置字符串
    async parameter2configText(guessPoolLength: number, guessLength: number, modeDuplicate: boolean, modeC: boolean, modeStupid: boolean): Promise<string> {
        const configText:string = guessPoolLength.toString().padStart(2,'0') +
                                  guessLength.toString().padStart(2,'0') +
                                  modeDuplicate + 
                                  modeC +
                                  modeStupid;
        return configText;
    }

    async addHistory(session: any, message: string, result: any) {
        const stats = await this.getStats(session);
        stats.guessHistory.push(new ABPlusSingleGuess(session,message,result));
        return this;
    }

    async showHistory(session: any): Promise<string> {
        const history = (await this.getStats(session)).guessHistory;
        const config = await this.getConfig(session);
        let historyText:string = '本局猜测历史\n=================';
        for(let i in history) {
            const resultText: string = `${history[i].guessResult.A}A${history[i].guessResult.B}B` + (config.modeC? `${+history[i].guessResult.C}C`: '');
            historyText = historyText + '\n' +  history[i].guessMessage + ' | ' + resultText;
        }
        return historyText;
    }

    async clearStats(session: any) {
        const stats = await this.getStats(session);
        stats.isPlaying = false;
        stats.guessHistory = [];
        stats.guessTimer();
        return this;
    }

    async clearAllStats() {
        await this.clearAllTimer();
        this.statsList = {};
    }
    //每个channel专属的timer
    async setTimeout(session: any, ctx: Context, callback: () => void, delay: number) {
        const stats = await this.getStats(session);
        stats.guessTimer = ctx.setTimeout(callback,delay);
    }
    //热重载不杀timer所以只好整个这个
    async clearAllTimer() {
        for(const key in this.statsList) {
            this.statsList[key].guessTimer();
        }
    }
}

//单个用户数据
class ABPlusSingleUserData {
    nickName: string = '?';          //昵称
    nickNameBeSet: boolean = false;  //是否已经自行设定昵称
    scoreFreq: Array<number> = [];   //最近几次游戏所用次数（叫frequency是因为time用了（说起来为什么不用count呢
    scoreTime: Array<number> = [];   //最近几次游戏所用时间
    guessCount: number = 0;          //总猜测次数
    winCount: number = 0;            //总获胜次数
    //以下是未来可能会添加的功能
    toturialProgress: number = 0;    //教程进度
    challengeCount: number = 0;      //每日挑战成功次数
    currentTheme: number = 0;        //当前主题


    //成绩写最近五次，读时取平均值
    get score() {
        if (this.scoreFreq.length === 0) return [];
        return [
            this.scoreFreq.reduce((acc, val)=>acc + val, 0) / this.scoreFreq.length,
            this.scoreTime.reduce((acc, val)=>acc + val, 0) / this.scoreTime.length
        ]
    }
    set score([scoreFreq, scoreTime]) {
        if(this.scoreFreq.length < 5) {
            this.scoreFreq.push(scoreFreq);
            this.scoreTime.push(scoreTime);
        }
        else {
            this.scoreFreq.shift();
            this.scoreFreq.push(scoreFreq);
            this.scoreTime.shift();
            this.scoreTime.push(scoreTime);
        }
    }
    constructor(userName:string) {
        this.nickName = userName;
    }
}
//理论上说这userdata和rank两个类也可以合并，这样和temp类的操作可以比较统一
//等将来吧
export class ABPlusUserData {
    userData = {};

    async getUserData(session: any) {
        //如果不存在用户数据则建立（其实好像不用encode来着...无所谓了反正没坏处
        if(!this.userData[encodeURIComponent(session.userId)]) {
            this.userData[encodeURIComponent(session.userId)] = new ABPlusSingleUserData(session.event.user.name);
            await this.writeUserData();
        }
        //如果用户未设定昵称则更新用户名
        else if(!this.userData[encodeURIComponent(session.userId)].nickNameBeSet) {
            this.userData[encodeURIComponent(session.userId)].nickName = session.event.user.name;
            await this.writeUserData();
        }
        return this.userData[encodeURIComponent(session.userId)];
    }
    
    async setUserData(session: any, valueName:string, value:number) {
        const data = await this.getUserData(session);
        data[valueName] = value;
        await this.writeUserData();
        return this;
    }

    async increaseUserData(session: any, valueName:string) {
        const data = await this.getUserData(session);
        data[valueName]++;
        await this.writeUserData();
        return this;
    }
    //为了避免出现恶性bug所以留了一个清空自己的数据的功能
    //嗯....用户自行设定的昵称说不定会有什么很不妙的东西呢...
    async clearUserData(session: any) {
        const data = await this.getUserData(session);
        Object.assign(data,new ABPlusSingleUserData(''));
        await this.writeUserData();
        return this;
    }

    async readUserData() {
        await readAndUpdate(this.userData, ABPlusSingleUserData, null, '/abPlusUserData.json', abpPath);
        return this;
    }

    async writeUserData() {
        await fs.writeFileSync(abpPath + '/abPlusUserData.json', JSON.stringify(this.userData,null,'\t'));
        return this;
    }

    //用户设定自己的昵称
    async setName(session: any, nickName: string) {
        const data = await this.getUserData(session);
        data.nickName = nickName;
        data.nickNameBeSet = true;
        await this.writeUserData();
        return nickName;
    }

    async getName(session: any) {
        const data = await this.getUserData(session);
        return data.nickName;
    }
    async getUserDataById(userId:string) {
        return this.userData[encodeURIComponent(userId)];
    }

    async getNameById(userId:string) {
        const data = await this.getUserDataById(userId);
        return data.nickName;
    }

    async setScore(session: any, scoreFreq:number, scoreTime: number) {
        const data = await this.getUserData(session);
        data.score = [scoreFreq, scoreTime];
        await this.writeUserData();
    }
}

//次数排行榜的单行数据
class ABPlusFreqRankLine {
    userId: string;
    score: number;
    scoreDate: string;
    constructor(userId: string, scoreFreq: number, scoreDate: string) {
        this.userId = userId;
        this.score = scoreFreq;
        this.scoreDate = scoreDate;
    }
}
//时间排行榜的单行数据
class ABPlusTimeRankLine {
    userId: string;
    score: number;
    scoreDate: string;
    constructor(userId: string, scoreTime: number, scoreDate: string) {
        this.userId = userId;
        this.score = scoreTime;
        this.scoreDate = scoreDate;
    }
}
//单个配置的个人最佳成绩
class PersonBest {
    bestFreq: number = Infinity;     //最佳次数
    bestTime: number = Infinity;     //最佳时间
}
//单个配置的排行榜
class ABPlusSingleRank {
    freqRank: Array<ABPlusFreqRankLine> = [];
    timeRank: Array<ABPlusTimeRankLine> = [];
    personBestList = {};
}
//排行榜
export class ABPlusRank {
    configRank = {};

    async getRank(config:ABPlusSingleConfig): Promise<ABPlusSingleRank> {
        const configText:string = await new ABPlusTemp().config2configText(config)
        if(!this.configRank[configText])
            this.configRank[configText] = new ABPlusSingleRank;
        return this.configRank[configText];
    }

    async getPersonBest(session: any, config:ABPlusSingleConfig) {
        const rank = await this.getRank(config);
        const userId = encodeURIComponent(session.event.user.id);
        if(!rank.personBestList[userId])
            rank.personBestList[userId] = new PersonBest;
        return rank.personBestList[userId];
    }

    async addRank(session: any, config:ABPlusSingleConfig, allUserData: ABPlusUserData,scoreFreq:number,scoreTime:number) {
        const rank:ABPlusSingleRank = await this.getRank(config);
        const personBest = await this.getPersonBest(session, config);
        const userId = encodeURIComponent(session.event.user.id);
        const scoreDate = new Date();
        allUserData.setScore(session, scoreFreq, scoreTime);
        allUserData.increaseUserData(session, 'winCount');
        const date = scoreDate.getFullYear().toString().slice(-2) + '.' + 
                     ('0' + (scoreDate.getMonth() + 1)).slice(-2) + '.' +
                     ('0' + (scoreDate.getDate() + 1)).slice(-2);
        //如果成绩可以进入前十则进入排行榜
        if(rank.freqRank.length != 10 || rank.freqRank[9].score > scoreFreq) {
            rank.freqRank.push(new ABPlusFreqRankLine(userId, scoreFreq, date));
            rank.freqRank.sort((a:ABPlusFreqRankLine, b:ABPlusFreqRankLine) => a.score - b.score);
            rank.freqRank.length > 10 && rank.freqRank.pop();
        }
        if(rank.timeRank.length != 10 || rank.timeRank[9].score > scoreTime) {
            rank.timeRank.push(new ABPlusTimeRankLine(userId, scoreTime, date));
            rank.timeRank.sort((a:ABPlusTimeRankLine, b:ABPlusTimeRankLine) => a.score - b.score);
            rank.timeRank.length > 10 && rank.timeRank.pop();
        }
        //录入个人最佳成绩
        if(personBest.bestFreq > scoreFreq)
            personBest.bestFreq = scoreFreq;
        if(personBest.bestTime > scoreTime)
            personBest.bestTime = scoreTime;

        await this.writeRank();
        return this;
    }

    async readRank() {
        await readAndUpdate(this.configRank, ABPlusSingleRank, null, '/abPlusRank.json', abpPath);
        return this;
    }

    async writeRank() {
        await fs.writeFileSync(abpPath + '/abPlusRank.json', JSON.stringify(this.configRank,null,'\t'));
        return this;
    }

    async getRankByConfigText(configText: string): Promise<ABPlusSingleRank> {
        if(!this.configRank[configText])
            this.configRank[configText] = new ABPlusSingleRank;
        return this.configRank[configText];
    }

    async showRank(config:ABPlusSingleConfig, allUserData:ABPlusUserData, isFreq:boolean) {
        const rank = await this.getRank(config);
        let returnRank = [];
        
        if(isFreq) returnRank = rank.freqRank;
        else returnRank = rank.timeRank;
        /* 
            给config一个配置显示文本并在这里显示吧...？
        */
        let rankText = `当前配置的${isFreq? '次数':'时间'}排行榜如下：\n=========================\n`
        if(returnRank.length === 0 )return `当前配置的${isFreq? '次数':'时间'}排行榜上还没有玩家...`
        else {
            for(const i in returnRank) {
                rankText += `${(+i + 1).toString().padStart(2,'0')}. ${returnRank[i].score}${isFreq? '次':'秒'} ${allUserData.getNameById(returnRank[i].userId)} ${returnRank[i].scoreDate}\n`
            }
        }
        return rankText;
    }

    async showRankByConfigText(configText: string, allUserData:ABPlusUserData, isFreq:boolean) {
        const rank = await this.getRankByConfigText(configText);
        let returnRank = [];
        if(isFreq) returnRank = rank.freqRank;
        else returnRank = rank.timeRank;

        let rankText = `${(configText === '1004falsefalsefalse')?'标准模式':'这一配置'}的${isFreq? '次数':'时间'}排行榜如下：\n=========================\n`
        if(returnRank.length === 0 )return `${(configText === '1004falsefalsefalse')?'标准模式':'这一配置'}的${isFreq? '次数':'时间'}排行榜上还没有玩家...`
        else {
            for(const i in returnRank) {
                rankText += `${(+i + 1).toString().padStart(2,'0')}. ${returnRank[i].score}${isFreq? '次':'秒'} ${allUserData.getNameById(returnRank[i].userId)} ${returnRank[i].scoreDate}\n`
            }
        }
        return rankText;
    }
}
//方便在以后添加新配置的时候更新
async function readAndUpdate(file: any,Type: any, typeParam: any, jsonName: string, filePath: string) {
    const newFile = {};
    const loadFile = await readOrCreate(jsonName, filePath);
    for(const key in loadFile) newFile[key] = new Type(typeParam);
    Object.assign(newFile, loadFile);
    Object.assign(file, newFile);
}

//读取文件
async function readOrCreate(jsonName: string, filePath: string): Promise<object> {
    if (!fs.existsSync(filePath))
        await fs.mkdirSync(filePath);
    const jsonPath = path.join(filePath, jsonName);
    try {
        const jsonData = await fs.readFileSync(jsonPath, 'utf8');
        return JSON.parse(jsonData);
    } catch (err) {
        if (err.code === 'ENOENT') {
            await fs.writeFileSync(jsonPath, '{}');
        } else throw err;
    }
    return {};
}