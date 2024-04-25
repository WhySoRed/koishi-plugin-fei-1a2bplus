"use strict";
import { Context, Schema, h } from 'koishi';
import {} from '@koishijs/plugin-help';

import { pathToFileURL } from 'url';
import{ resolve } from 'path';
import { ABPlusSingleConfig } from './abPlusClassesAndFiles';

export const name = 'fei-1a2b-test';
const abCF = require('./abPlusClassesAndFiles')

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

/*
    koishi-plugin-1a2bPlusByFei
    初学js，初学写插件
    只是想要写个小东西练手
    为什么会变成这样呢..
*/

export function apply(ctx: Context) {
    // write your plugin here
    const abPlusTemp = new abCF.ABPlusTemp;
    const abPlusUserData = new abCF.ABPlusUserData;
    const abPlusRank = new abCF.ABPlusRank;
    abPlusTemp.readConfig();
    abPlusUserData.readUserData();
    abPlusRank.readRank();

    //重载前记录数据..和清除计时器
    ctx.on('dispose', async () => {
        await abPlusTemp.writeConfig();
        await abPlusUserData.writeUserData();
        await abPlusRank.writeRank();
        await abPlusTemp.clearAllStats();
    })

    ctx.command('1a2b\+','来玩1A2B\+吧！')
    .action(async (_) =>{
        let welcome: any;
        const config = await abPlusTemp.getConfig(_.session);

        if(config.modeStupid) welcome = h('img', { src: 'https://s21.ax1x.com/2024/04/23/pk9cKVP.png' }) + '1A2B+...吧？';
        else if(config.modeC) welcome = h('img', { src: 'https://s21.ax1x.com/2024/04/23/pk9cmDI.png' }) + '1A2BC☆';
        else if(config.modeDuplicate) welcome = h('img', { src: 'https://s21.ax1x.com/2024/04/25/pkCx83D.png' }) + '1A2B1A2B+☆';
        else welcome = h('img', { src: 'https://s21.ax1x.com/2024/04/22/pk9FRAA.png' }) + '1A2B+☆';

        _.session.send('这里是...' + welcome)
        .then(() => _.session.send(`
1A2BPlus v1.0.1
=========================
✄指令列表：
1a2b+开始
1a2b+结束
1a2b+设置
1a2b+排行榜
1a2b+个人信息
1a2b是什么
=========================
` + abpTips()))
    })
    .usage(`
欢迎玩1a2b+
发送“1a2b+开始”后就可以猜咯~
指令列表：
1a2b+开始 或 abps
1a2b+猜 或 加猜 或 abpg
1a2b+结束 或 abpe
1a2b+设置 或 abpo
1a2b+排行榜 或 abpr
1a2b+个人信息 或 abpi
`)

    function abpTips(){
        const now = new Date();
        const tipsArr = [
            'JS真不错阿JS',
            '感谢蒜苗苗对作者的大量帮助~',
            '广告位招租（骗人的',
            '下次更新将添加教程',
            '我想说什么来着',
            '救命呐，我被困在机器人里了',
            '（其实作者都没玩过几次C模式',
            `今年已经过去了${Math.floor((now.getTime() - new Date(now.getFullYear(),0,1).getTime()) / 1000 / 60 / 60 / 24)}天`,
            '才...才不会给你作者的联系方式',
            'Per aspera ad astra.”\n    “循此苦旅，终抵繁星',
            '可是我的自卑胜过了”\n          “一切爱我的',
            '带我去吧，你所在的地方',
            '我用高价换取了自由”\n   “但却不想连心都廉价出售',
        ];
        return '“' + tipsArr[Math.floor(Math.random() * tipsArr.length)] + '”';
    }

    ctx.command('1a2b是什么', { hidden: true })
    .action((_) => {
        return `
1A2B是一种规则十分简单的猜数字游戏~
你要猜出随机生成的答案是什么
而每次猜测都会给你提示，
A前的数字代表“这个数目的数字在答案里存在并且在他们该在的位置上！”
B前的数字表示“这个数目的数字在答案里存在但不在他们该在的位置上！”
例如答案是4567 猜测输入4571，会给出2A1B的结果
4和5完全正确，所以是2A
7在答案中，但是位置不对，所以是1B
想要猜到答案有很多种方法，快来试试看吧
`
    })

    ctx.command('1a2b\+开始', { hidden: true })
    .alias('abps')
    .action(async (_) =>{
        const stats = await abPlusTemp.getStats(_.session);
        const config = await abPlusTemp.getConfig(_.session);
        if(stats.isPlaying === true)
            return '已经有游戏正在进行中了的说...';
        stats.isPlaying = true;

        let returnText:string = `游戏已经开始了
当前猜测范围：${config.guessPoolDescribe}
当前猜测长度：${config.guessLength}`;
        if(config.modeDuplicate) returnText += '\n重复模式已开启';
        if(config.modeC) returnText += '\nC模式已开启';
        if(config.modeStupid) returnText += '\n愚人模式已开启';
        return returnText + '\n输入“1a2b+猜 （猜测的内容）” 就可以猜咯';
    })
    .usage('开始一局新的1a2b+！')

    ctx.middleware(async (session, next) => {
        if ((session.content === '1a2b+结束' || session.content === 'abpe')&& session.event.channel.type) {
            return await abPlusGameEnd(session);
        } else {
          return next()
        }
    })

    ctx.command('1a2b\+结束', { hidden: true })
    .alias('abpe')
    .action(async ({ session }) => {
        return await abPlusGameEnd(session);
    })
    .usage('强制结束这里的1a2b+')

    async function abPlusGameEnd (session:any) {
        const stats = await abPlusTemp.getStats(session);
        
        if (!stats.isPlaying)
            return '还没有在玩1a2b啊...'
        if (stats.guessHistory.length === 0)
            return '好歹猜一下嘛.....好吧好吧，结束咯';

        let endMessage:string;
        if(stats.guessLength > 6)
            endMessage = '太长了的确不好猜呢...';
        else if(stats.guessHistory.length < 3)
            endMessage = '这么快就不猜了吗？';
        else if(stats.guessHistory.length > 20)
            endMessage = '真不容易啊...';
        else 
            endMessage = 'See u next time~';

        await session.send('本局1a2b已手动结束...答案是:\n“' + stats.guessAnswer.join('') + '”\n    ' + endMessage);
        await abPlusTemp.clearStats(session);
    }

    ctx.command('1a2b\+个人信息', { hidden: true })
    .alias('abpi')
    .action(async ({ session }) => {
        const config = await abPlusTemp.getConfig(session);
        const userData = await abPlusUserData.getUserData(session);
        const personBest = await abPlusRank.getPersonBest(session, config);
        let scoreText = '';
        if(userData.score.length === 0)
            scoreText += '您还没有开始过1a2b\n';
        else {
            let [freq,time] = await userData.score;
            scoreText += `
最近五局游戏的平均次数是${freq}次
最近五局游戏的平均时间是${time}秒
当前配置的最佳次数是${personBest.bestFreq}次
当前配置的最佳时间是${personBest.bestTime}秒`;
        }
        return `
您的信息：
昵称：${userData.nickName}
总猜测次数：${userData.guessCount}
总猜中次数：${userData.winCount}
` + scoreText;
    }) 
    .usage('这个也要help吗？')

    ctx.command('1a2b\+排行榜', { hidden: true })
    .alias('abpr')
    .action(async ({ session }) => {
        session.send(`
你想要查看哪个排行榜呢？
可查看的排行榜有：
  .当前次数
  .当前时间
  .标准次数
  .标准时间
  .次数
  .时间
`);
    })
    .usage(`
排行榜说明：
.当前次数 或 .1
  -当前配置次数排行榜
.当前时间 或 .2
  -当前配置时间排行榜
.标准次数 或 .标1
  -标准模式次数排行榜
.标准时间 或 .标2
  -标准模式时间排行榜
.次数
  -输入配置的次数排行榜 
.时间
  -输入配置的时间排行榜
`)

    ctx.command('1a2b\+排行榜.当前次数', { hidden: true })
    .alias('.1')
    .action(async ({ session }) => {
        const config = await abPlusTemp.getConfig(session);
        return abPlusRank.showRank(config, abPlusUserData, true);
    })
    .usage('这里没有帮助阿')

    ctx.command('1a2b\+排行榜.当前时间', { hidden: true })
    .alias('.2')
    .action(async ({ session }) => {
        const config = await abPlusTemp.getConfig(session);
        return abPlusRank.showRank(config, abPlusUserData, false);
    })
    .usage('写帮助好麻烦呀')

    ctx.command('1a2b\+排行榜.标准次数', { hidden: true })
    .alias('.标1', '.classic1', '.cl1')
    .action(async ({ session }) => {
        return abPlusRank.showRankByConfigText('1004falsefalsefalse', abPlusUserData, true);
    })
    .usage('虽然叫标准模式但其实 .classic1 .cl1也行')

    ctx.command('1a2b\+排行榜.标准时间', { hidden: true })
    .alias('.标2', '.classic2,', '.cl2')
    .action(async ({ session }) => {
        return abPlusRank.showRankByConfigText('1004falsefalsefalse', abPlusUserData, false);
    })
    .usage('虽然也叫标准模式但其实 .classic2 .cl2也行')

    ctx.command('1a2b\+排行榜.次数 <message>', { hidden: true })
    .alias('.c','.coumt')
    .action(async (_) => {
        let paramentCheckText:string;
        if((paramentCheckText = await abPlusRankParameterCheck(_.args, true)) !== '')
            return paramentCheckText;
        else
            return await abPlusRank.showRankByConfigText(
                await abPlusTemp.parameter2configText(
                    _.args[0],
                    _.args[1],
                    (_.args[2] == '是'? true: false),
                    (_.args[3] == '是'? true: false),
                    (_.args[4] == '是'? true: false)
                ),
                abPlusUserData,
                true
            )
    })
    .usage(`
✄本指令格式为：
1a2b+排行榜.次数 <猜测池长度> <猜测长度> <是否允许重复> <是否开启C模式> <是否开启愚人模式>
如：
1a2b+排行榜.次数 10 4 是 是 是（即标准模式）
`)

    ctx.command('1a2b\+排行榜.时间 <message>', { hidden: true })
    .alias('.t','.time')
    .action(async (_) => {
        let paramentCheckText:string;
        if((paramentCheckText = await abPlusRankParameterCheck(_.args, false)) !== '')
            return paramentCheckText;
        else {
            return await abPlusRank.showRankByConfigText(
                await abPlusTemp.parameter2configText(
                    _.args[0],
                    _.args[1],
                    (_.args[2] == '是'? true: false),
                    (_.args[3] == '是'? true: false),
                    (_.args[4] == '是'? true: false)
                ),
                abPlusUserData,
                false
            )
        }
    })
    .usage(`
✄本指令格式为：
1a2b+排行榜.时间 <猜测池长度> <猜测长度> <是否允许重复> <是否开启C模式> <是否开启愚人模式>
如：
1a2b+排行榜.时间 10 4 是 是 是（即标准模式）
`)

    async function abPlusRankParameterCheck(args:Array<string>, isFreq:boolean) {
        if(args.length !== 5) 
            return `
✄本指令格式为：
1a2b+排行榜.${isFreq? '次数':'时间'} 猜测池长度 猜测长度 是否允许重复 是否开启C模式 是否开启愚人模式
如：
1a2b+排行榜.${isFreq? '次数':'时间'} 10 4 是 是 是（即标准模式）
`;
        else if(
            Number.isNaN(+args[0]) ||
            Number.isNaN(+args[1]) ||
            +args[0] <= 0 ||
            +args[1] <= 0 ||
            +args[0] - Math.floor(+args[0]) != 0 ||
            +args[1] - Math.floor(+args[1]) != 0
        )
            return '猜测池长度与猜测长度必须是正整数';
        else if(
            args[2] !== '是' && args[2] !== '否' ||
            args[3] !== '是' && args[3] !== '否' ||
            args[4] !== '是' && args[4] !== '否'
        )
            return '是否开启某一模式只能选择 是 或 否';
        else if(+args[0] > 30)
            return '猜测池长度过长'
        else if(+args[1] > 20)
            return '猜测长度过长'
        return '';
    }

    ctx.command('1a2b\+设置', { hidden: true })
    .alias('abpo')
    .action(async ({ session }) => {
        const config = await abPlusTemp.getConfig(session);
        const userData = await abPlusUserData.getUserData(session);
        await session.send(`
你想要更改这里的设置吗？
可供更改的设置有
  .猜测范围 当前:${config.guessPoolDescribe}
  .猜测长度 当前:${config.guessLength}
  .重复模式 当前:${config.modeDuplicate? '开启': '关闭'}
  .C模式 当前:${config.modeC? '开启': '关闭'}
  .愚人模式 当前:${config.modeStupid?'开启': '关闭'}
  .重置以上设置
  .设定昵称 当前:${userData.nickNameBeSet?'已设置': '默认'}
查看设置详情请输入
   help 1a2b\+设置
`);
    })
    .usage(`
✄各项设置的详细内容：
  .猜测范围 <参数1> [参数2] ...
    -默认为0~9
    -单个参数时为0到该参数
    -两个参数时为参数1到参数2
    -更多参数时...?
  .猜测长度
    -答案的长度 默认为4
  .重复模式
    -开/关重复模式
    -允许答案与猜测中出现重复
    -默认猜测范围为0~4
    -会重置猜测长度为4
  .C模式
    -开/关C模式
    -作者自创的实验性模式（）
    -C表示这个数量的字符存在
    -但位置在正确位置之右
  .愚人模式
    -开/关愚人模式
    -允许更奇怪的猜测池
    -允许更长的猜测长度
    -允许肆意妄为的输入
    -并永远允许输入重复
  .重置以上设置
    -重置猜测范围与模式设置
  .设定昵称
    -设定你的昵称
    -（会显示在排行榜上）
  额外功能（以防万一）
  .查看群聊id
  .查看个人id
`)

    ctx.command('1a2b\+设置.猜测范围 <message:text>', { hidden: true })
    .action(async (_, message) => {
        const stats = await abPlusTemp.getStats(_.session);
        const config = await abPlusTemp.getConfig(_.session);
        if(stats.isPlaying) return '在游戏中不可以更改设置~';

        if(message === undefined) {
            if(config.modeDuplicate) {
                config.guessPool = ['0', '1', '2', '3', '4', '5'];
                config.guessPoolDescribe = '0~5';
            }
            else {
                config.guessPool = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
                config.guessPoolDescribe = '0~9';
            }
            await abPlusTemp.setConfig(_.session, 'guessLength', 4);
            return '猜测范围已重置';
        }

        if(!config.modeStupid) {
            const guessRangeArgs = message.replace(/\s+/g,' ').split(' ');
            //不支持emoji等长度为2的字符
            if(guessRangeArgs.find(char => char.length > 1))
                return '本指令的每个参数必须是长度不超过1的字符';
            const guessPoolBase = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
            let guessRangeStart:number = 0;
            let guessRangeEnd:number;
            //正常模式下输入了单个参数时
            if(guessRangeArgs.length === 1) {
                guessRangeEnd = parseInt(guessRangeArgs[0], 16);
                if(Number.isNaN(guessRangeEnd))
                    return '输入的猜测范围上限有误';
                if(guessRangeEnd < 2)
                    return '猜测范围不可以少于三个字符...';
                config.guessPool = guessPoolBase.slice(guessRangeStart, guessRangeEnd + 1);
                config.guessPoolDescribe = '0~' + guessPoolBase[guessRangeEnd];
                if(guessRangeEnd === 2)
                    await abPlusTemp.setConfig(_.session, 'guessLength', 3);
                else 
                    await abPlusTemp.setConfig(_.session, 'guessLength', 4);
                return '猜测范围已经设置为 ' + config.guessPoolDescribe + '\n猜测长度自动设置为 ' + config.guessLength;
            }
            //正常情况下输入了两个参数时
            else if(guessRangeArgs.length === 2) {
                guessRangeStart = parseInt(guessRangeArgs[0],16)
                guessRangeEnd = parseInt(guessRangeArgs[1],16);
                if(Number.isNaN(guessRangeStart) || Number.isNaN(guessRangeEnd))
                    return '输入的猜测范围参数有误';
                if(guessRangeStart < guessRangeEnd)
                    [guessRangeStart, guessRangeEnd] = [guessRangeEnd, guessRangeStart];
                if(guessRangeEnd - guessRangeStart < 2)
                    return '猜测范围不可以少于三个字符...';
                config.guessPool = guessPoolBase.slice(guessRangeStart, guessRangeEnd + 1);
                config.guessPoolDescribe = guessPoolBase[guessRangeStart] + '~' + guessPoolBase[guessRangeEnd];
                if(guessRangeEnd - guessRangeStart === 2)
                    await abPlusTemp.setConfig(_.session, 'guessLength', 3);
                else 
                    await abPlusTemp.setConfig(_.session, 'guessLength', 4);
                return '猜测范围已经设置为 ' + config.guessPoolDescribe + '\n猜测长度自动设置为 ' + config.guessLength;
            }
            else if(guessRangeArgs.length > 16) {
                return '输入的太多了...少一点少一点';
            }
            else {
                const charSet = new Set();
                for(const char of guessRangeArgs) {
                    if (charSet.has(char)) {
                        return '正常模式猜测范围不可以设定重复字符';
                    }
                    charSet.add(char);
                }
                config.guessPool = guessRangeArgs.slice();
                config.guessPoolDescribe = '"' + guessRangeArgs.join('", "') + '"';
                if(guessRangeArgs.length === 3)
                    await abPlusTemp.setConfig(_.session, 'guessLength', 3);
                else 
                    await abPlusTemp.setConfig(_.session, 'guessLength', 4);
                return '猜测范围已经设置为 ' + config.guessPoolDescribe + '\n猜测长度自动设置为 ' + config.guessLength;
            }
        }
        else {
            let cutMessage:string;
            if(message.startsWith('"') && message.endsWith('"') || message.startsWith("'") && message.endsWith("'")) {
                cutMessage = message.slice(1,-1);
            }
            else cutMessage = message.slice();
            if(cutMessage.length < 3)
                return '至少输入三个字符吧~'
            else {
                if(cutMessage.length > 30) return '虽然我很想鼓励你想塞超过30个字符进猜测池的勇气，不过还是太多了一点，少一点吧'
                if(cutMessage.split('').some((char, _, s) => s.filter(c => c === char).length > cutMessage.length / 3))
                    return '有一种字符的数量超过了所有字符数的三分之一...这样可能会让猜测变得太简单，改一改吧';
                config.guessPool = cutMessage.split('');
                config.guessPoolDescribe = '"' + config.guessPool.join('", "') + '"';
                if(cutMessage.length === 3)
                    await abPlusTemp.setConfig(_.session, 'guessLength', 3);
                else 
                    await abPlusTemp.setConfig(_.session, 'guessLength', 4);
                return '猜测范围已经设置为 ' + config.guessPoolDescribe + '\n猜测长度自动设置为 ' + config.guessLength;
            }
        }
    })
    .usage(`
愚人模式下猜测范围不需要输入空格，指令后从第一个非空白字符开始到结尾第一个非空白字符都会被塞入猜测池...
幸好引号可以把奇怪的输入也包起来
`)

    ctx.command('1a2b\+设置.猜测长度 <message>', { hidden: true })
    .action(async (_,message) => {
        const stats = await abPlusTemp.getStats(_.session);
        const config = await abPlusTemp.getConfig(_.session);
        if(stats.isPlaying) return '在游戏中不可以更改设置~';

        if(message === undefined) {
            if(config.guessPool.length === 3)
                await abPlusTemp.setConfig(_.session, 'guessLength', 3);
            else
            await abPlusTemp.setConfig(_.session, 'guessLength', 3);
            return '猜测长度已重置';
        }

        let inputGuessLength:number;
        if(/\D/.test(message))
            inputGuessLength = parseInt(message, 16);
        else
            inputGuessLength = +message;

        if(Number.isNaN(inputGuessLength)) return '猜测长度需要是数字才行哦'
        if(!config.modeDuplicate) {
            if(inputGuessLength > config.guessPool.length)
                return '非重复模式下猜测长度不可以超过猜测范围长度...';
            else if(config.modeStupid && inputGuessLength > 20)
                return '愚人模式的猜测长度也不可以超过20...想猜这么多...你是认真的吗？';
            else if(!config.modeStupid && inputGuessLength > 16)
                return '普通模式下猜测长度不可以超过16';
            else {
                await abPlusTemp.setConfig(_.session, 'guessLength', inputGuessLength);
                if(inputGuessLength > 6)
                    return '猜测长度已设定为 ' + inputGuessLength +' \n警告：过长的猜测长度可能会导致非常难找到正确答案';
                else
                return '猜测长度已设定为 ' + inputGuessLength;
            }
        }
        else {
            if(config.modeStupid && inputGuessLength > 20)
                return '愚人模式的猜测长度也不可以超过20...想猜这么多...你是认真的吗？';
            else if(!config.modeStupid && inputGuessLength > 16)
                return '普通模式下猜测长度不可以超过16';
            else {
                await abPlusTemp.setConfig(_.session, 'guessLength', inputGuessLength);
                if(inputGuessLength > 6)
                    return '猜测范围已设定为 ' + inputGuessLength +' \n警告：过长的猜测长度可能会导致非常难找到正确答案';
                else
                return '猜测范围已设定为 ' + inputGuessLength;
            }
        }
    })
    .usage(`
其实...即使是非愚人模式
范围和长度也可以是16进制数字哟
`)

    ctx.command('1a2b\+设置.C模式', { hidden: true })
    .alias('.C')
    .action(async (_,message) => {
        const stats = await abPlusTemp.getStats(_.session);
        const config = await abPlusTemp.getConfig(_.session);
        if(stats.isPlaying) return '在游戏中不可以更改设置~';
        if(config.modeC) {
            await abPlusTemp.setConfig(_.session,'modeC', false);
            return 'C模式已关闭';
        }
        else {
            await abPlusTemp.setConfig(_.session,'modeC', true);
            return `
C模式已开启
再次发送本指令可以关闭
这是作者自创的一个实验性模式
开启后会在AB后添加新的计数C
具体请查看
help 1a2b+设置.C模式
`;
        }
    })
    .usage(`
✄C模式
C前的数字代表存在，但位置在正确位置右方的字符数目
例：正确答案是1234 输入的猜测是4632
答案会显示1A2B1C
‘2’在答案中存在，但在正确位置右，因此符合C的条件
例：正确答案是1234 输入的猜测是2341
答案会显示0A4B1C
例：正确答案是1234 输入的猜测是4123
答案会显示0A4B3C
开启C模式并不会影响B的计数
`)

    ctx.command('1a2b\+设置.重复模式', { hidden: true })
    .action(async (_,message) => {
        const stats = await abPlusTemp.getStats(_.session);
        const config = await abPlusTemp.getConfig(_.session);
        if(stats.isPlaying) return '在游戏中不可以更改设置~';

        if(config.modeDuplicate) {
            await abPlusTemp.reSetConfig(_.session, 'guessPool');
            await abPlusTemp.reSetConfig(_.session, 'guessPoolDescribe');
            await abPlusTemp.reSetConfig(_.session, 'guessLength');
            await abPlusTemp.setConfig(_.session, 'modeDuplicate', false);
            return '重复模式已关闭，猜测范围与长度已刷新';
        }
        else {
            config.guessPool = ['0', '1', '2', '3', '4', '5'];
            config.guessPoolDescribe = '0~5';
            await abPlusTemp.setConfig(_.session,'modeDuplicate', true);
            return `
重复模式已开启
再次发送本指令可以关闭
开启后默认猜测范围为0~5
答案可能会出现重复字符
`;
        }
    })
    .usage(`
✄重复模式
允许答案中出现重复的字符
也允许在猜测时使用重复的字符
请注意B会匹配多次！
例：正确答案是1234 输入的猜测是4442
答案会显示1A3B
`)

    ctx.command('1a2b\+设置.愚人模式', { hidden: true })
    .action(async (_,message) => {
        const stats = await abPlusTemp.getStats(_.session);
        const config = await abPlusTemp.getConfig(_.session);
        if(stats.isPlaying) return '在游戏中不可以更改设置~';

        if(config.modeStupid) {
            await abPlusTemp.reSetConfig(_.session, 'guessPool');
            await abPlusTemp.reSetConfig(_.session, 'guessPoolDescribe');
            await abPlusTemp.reSetConfig(_.session, 'guessLength');
            await abPlusTemp.setConfig(_.session, 'modeStupid', false);
            return '愚人模式已关闭，猜测范围与长度已刷新';
        }
        else {
            await abPlusTemp.setConfig(_.session,'modeStupid', true);
            return `
愚人模式已开启~
再次发送本指令可以关闭
具体请查看
help 1a2b+设置.愚人模式
`;  
            }
    })
    .usage(`
✄愚人模式
开启后
在群聊中必须发送指令才能猜
更自由的猜测方式
更多样的猜测范围
更长的猜测数字
变得区分大小写
注意 如果你使用了比较特殊的字符，猜测前后带上引号可能是好主意
虽然但是，还是不支持emoji
`)

    ctx.command('1a2b\+设置.重置以上设置', { hidden: true })
    .action(async (_,message) => {
        abPlusTemp.refreshConfig(_.session);
    })
    .usage('重设猜测范围、猜测长度与所有模式')

    ctx.command('1a2b\+设置.设定昵称', { hidden: true })
    .action(async (_,message) => {
        if(!message) 
            return '昵称不能为空';
        else
            return '已设定昵称为：' + await abPlusUserData.setName(_.session,message);
    })
    .usage('设定你显示在排行榜上的昵称')

    ctx.command('1a2b\+设置.查看群聊id', { hidden: true })
    .action(async (_,message) => {
        return encodeURIComponent(_.session.channelId);
    })

    ctx.command('1a2b\+设置.查看个人id', { hidden: true })
    .action(async (_,message) => {
        return encodeURIComponent(_.session.event.user.id);
    })


    ctx.command('1a2b\+猜 <message:text>', { hidden: true })
    .alias('加猜','abpg')
    .action(async (_, message) => {
        const stats = await abPlusTemp.getStats(_.session);
        if (message === undefined) return '你猜啥？';
        if (!stats.isPlaying) return '还没开始呢！';

        let cutMessage:string;
        
        if(message.startsWith('"') && message.endsWith('"') || message.startsWith("'") && message.endsWith("'")) {
            cutMessage = message.slice(1,-1);
        }
        else {
            cutMessage = message.slice();
        }

        let checkResult = await abPlusCheck(_.session, cutMessage);
        if(!(checkResult).checkResult) return checkResult.reason;

        await abPlusUserData.increaseUserData(_.session, 'guessCount');
        return await abPlusGuess(_.session, cutMessage);
    })
    .usage(`猜~就是~猜呗...还能是啥
不过，群聊时发送的消息如果符合可能出现的答案的话也会被匹配
除了读不到消息的可怜的qq官方机器人（叹
`)

    ctx.middleware(async (session, next) => {
        const stats = await abPlusTemp.getStats(session);
        const config = await abPlusTemp.getConfig(session);
        if(stats.isPlaying && !config.modeStupid){
            const checkResult = await abPlusCheck(session, session.content);
            if(stats.inGuild) {
                if(checkResult.checkResult) {
                    abPlusUserData.increaseUserData(session, 'guessCount');
                    session.send(await abPlusGuess(session,session.content));
                }
            }
            else if(!session.content.startsWith('/')) {
                if(checkResult.checkResult) {
                    abPlusUserData.increaseUserData(session, 'guessCount');
                    session.send(await abPlusGuess(session,session.content));
                }
                else session.send(checkResult.reason);
            }
        }
    })
    //对猜测输入进行检测
    async function abPlusCheck(session:any,message:string){
        const config = await abPlusTemp.getConfig(session);
        const result = {
            checkResult:true,
            reason:''
        }

        if(config.modeStupid) return result;      //愚人模式不进行输入检查
        if(message.length !== config.guessLength) {
            result.checkResult = false;
            result.reason = '输入长度与答案长度不同~';
            return result;
        }
        if(new RegExp('[^' + config.guessPool.join('') + ']').test(message)){
            result.checkResult = false;
            result.reason = '有不在猜测池的字符哦';
            return result;
        }
        if(!config.modeDuplicate) {
            const charSet = new Set();
            for(const char of message) {
                if (charSet.has(char)) {
                    result.checkResult = false;
                    result.reason = '普通模式不可以猜重复字符~';
                }
                charSet.add(char);
            }
        }
        return result;

    }
    //把猜测输入与答案进行比较
    async function abPlusGuess(session:any, message:string) {
        const stats = await abPlusTemp.getStats(session);
        const config = await abPlusTemp.getConfig(session);
        let guessMessage:string;
        //非愚人模式下字符不会精准匹配
        if(!config.modeStupid) {
            guessMessage = message.toLowerCase();
        }
        else guessMessage = message;

        stats.guessTimer();
        const result = {A: 0, B: 0, C: 0};
        let returnText:string = '';
        if(stats.guessHistory.length === 0) {
            stats.guessStartTime = new Date();
            stats.guessAnswer = await abPlusCreateAnswer(session)
            Object.assign(result, await abPlusCompare(stats, guessMessage));
            //如果第一轮就猜中则重置
            if(result.A === config.guessLength) {
                abPlusShuffle(stats.guessAnswer);
                Object.assign(result, await abPlusCompare(stats, guessMessage));
                if(result.A === config.guessLength) {
                    await abPlusTemp.clearStats(session);
                    await abPlusGameWin(session, guessMessage);
                    return `...可恶...你怎么第一轮就猜中了`;
                }
                else {
                    await abPlusTemp.addHistory(session, guessMessage, result);
                    returnText = await abPlusTemp.showHistory(session);
                }
            }
            else {
                await abPlusTemp.addHistory(session, guessMessage, result);
                returnText = await abPlusTemp.showHistory(session);
            }
        }
        else {
            if(stats.guessHistory.find(history => history.guessMessage === guessMessage))
                return guessMessage + ' 已经猜过了的说';
            Object.assign(result,await abPlusCompare(stats,guessMessage));
            if(result.A === config.guessLength) {
                await abPlusTemp.addHistory(session, guessMessage, result);
                return await abPlusGameWin(session, guessMessage);
            }
            else {
                await abPlusTemp.addHistory(session, guessMessage, result);
                returnText = await abPlusTemp.showHistory(session);
            }
        }
        await abPlusTemp.setTimeout(session, ctx, ()=>{
            abPlusTemp.clearStats(session);
            session.send('五分钟没有任何人猜，游戏已自动结束~');
        },300000)
        return returnText;
    }
    //比较输入与答案
    async function abPlusCompare(stats: any, message: string) {
        const arrA:Array<string> = Array.from(stats.guessAnswer);
        const arrG:Array<string> = message.split('');
        const arrAstr = arrA.join('')
        const result = {A: 0, B: 0, C: 0};

        arrG.forEach((item,index) => {
            if(item === arrA[index])
                result.A++;
            else if (arrAstr.includes(item)) 
                result.B++;
            if(arrAstr.slice(0, index).includes(item)) {
                result.C++;
            }
        });
        return result;
    }

    async function abPlusCreateAnswer(session:any) {
        const config = await abPlusTemp.getConfig(session);
        const gPool:Array<string> = Array.from(config.guessPool);
        if(config.modeDuplicate){
            let guessAnswer = [];
            for(let i = 0; i < config.guessLength; i++)
                guessAnswer.push(gPool[Math.floor(Math.random() * gPool.length)])
            return guessAnswer;
        }
        else{
            return abPlusShuffle(gPool).slice(0, config.guessLength);
        }
    }
    //游戏胜利 返回显示文本
    async function abPlusGameWin(session:any,message:string):Promise<string> {
        const stats = await abPlusTemp.getStats(session);
        const config = await abPlusTemp.getConfig(session);
        const scoreDate = new Date();
        const scoreFreq = stats.guessHistory.length;
        const scoreTime = (scoreDate.getTime() - stats.guessStartTime.getTime()) / 1000;
        const returnText = await abPlusTemp.showHistory(session) + '\n=================\n答案是 ' + message;
        await abPlusRank.addRank(session, config, abPlusUserData, scoreFreq, scoreTime);
        await abPlusTemp.clearStats(session); 

        return returnText + `\n${(stats.inGuild)? `猜中的人是${abPlusUserData.getNameById(session.event.user.id)}，大家一共`: '猜中啦，一共'}猜了${scoreFreq}次，用时${scoreTime}秒~`;
    }

    //Fisher-Yates洗牌算法
    function abPlusShuffle(arr:Array<string>) {
        for(let i = arr.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [arr[i],arr[j]] = [arr[j],arr[i]];
        }
        return arr;
    } 
}