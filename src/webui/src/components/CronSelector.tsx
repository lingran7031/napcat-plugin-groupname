import React, { useState, useEffect } from 'react'
import { IconClock } from './icons'

interface CronSelectorProps {
    value: string
    onChange: (value: string) => void
}

interface CronPreset {
    label: string
    value: string
    description: string
}

const CRON_PRESETS: CronPreset[] = [
    { label: '每分钟', value: '* * * * *', description: '每分钟执行一次' },
    { label: '每小时', value: '0 * * * *', description: '每小时的第0分钟执行' },
    { label: '每天', value: '0 0 * * *', description: '每天0点执行' },
    { label: '每周', value: '0 0 * * 0', description: '每周日0点执行' },
    { label: '每月', value: '0 0 1 * *', description: '每月1号0点执行' },
    { label: '自定义', value: 'custom', description: '自定义执行时间' },
]

export default function CronSelector({ value, onChange }: CronSelectorProps) {
    const [mode, setMode] = useState<'preset' | 'custom'>('preset')
    const [selectedPreset, setSelectedPreset] = useState<string>(value)
    const [customCron, setCustomCron] = useState({
        minute: '*',
        hour: '0',
        day: '*',
        month: '*',
        weekday: '*',
    })

    useEffect(() => {
        const isPreset = CRON_PRESETS.some(p => p.value === value)
        if (isPreset) {
            setMode('preset')
            setSelectedPreset(value)
        } else {
            setMode('custom')
            const parts = value.split(' ')
            if (parts.length === 5) {
                setCustomCron({
                    minute: parts[0],
                    hour: parts[1],
                    day: parts[2],
                    month: parts[3],
                    weekday: parts[4],
                })
            }
        }
    }, [value])

    const handlePresetChange = (presetValue: string) => {
        if (presetValue === 'custom') {
            setMode('custom')
        } else {
            setMode('preset')
            setSelectedPreset(presetValue)
            onChange(presetValue)
        }
    }

    const handleCustomChange = (field: keyof typeof customCron, newValue: string) => {
        const newCron = { ...customCron, [field]: newValue }
        setCustomCron(newCron)
        const cronValue = `${newCron.minute} ${newCron.hour} ${newCron.day} ${newCron.month} ${newCron.weekday}`
        onChange(cronValue)
    }

    const generateOptions = (start: number, end: number, step: number = 1) => {
        const options = []
        for (let i = start; i <= end; i += step) {
            options.push({ label: String(i), value: String(i) })
        }
        return options
    }

    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => setMode('preset')}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        mode === 'preset'
                            ? 'bg-pink-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                >
                    预设
                </button>
                <button
                    type="button"
                    onClick={() => setMode('custom')}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        mode === 'custom'
                            ? 'bg-pink-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                >
                    自定义
                </button>
            </div>

            {mode === 'preset' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {CRON_PRESETS.map(preset => (
                        <button
                            key={preset.value}
                            type="button"
                            onClick={() => handlePresetChange(preset.value)}
                            className={`p-3 text-left rounded-lg border-2 transition-all ${
                                selectedPreset === preset.value
                                    ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
                                    : 'border-gray-200 hover:border-pink-300 dark:border-gray-700 dark:hover:border-pink-500/50'
                            }`}
                        >
                            <div className="font-medium text-sm text-gray-800 dark:text-white mb-1">
                                {preset.label}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                {preset.description}
                            </div>
                            {preset.value !== 'custom' && (
                                <div className="mt-2 text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-600 dark:text-gray-300">
                                    {preset.value}
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {mode === 'custom' && (
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <IconClock size={16} />
                        <span>自定义执行时间</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                分钟 (0-59)
                            </label>
                            <select
                                value={customCron.minute}
                                onChange={e => handleCustomChange('minute', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-white dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none"
                            >
                                <option value="*">每分钟</option>
                                {generateOptions(0, 59, 5).map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                小时 (0-23)
                            </label>
                            <select
                                value={customCron.hour}
                                onChange={e => handleCustomChange('hour', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-white dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none"
                            >
                                <option value="*">每小时</option>
                                {generateOptions(0, 23).map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                日期 (1-31)
                            </label>
                            <select
                                value={customCron.day}
                                onChange={e => handleCustomChange('day', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-white dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none"
                            >
                                <option value="*">每天</option>
                                {generateOptions(1, 31).map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                月份 (1-12)
                            </label>
                            <select
                                value={customCron.month}
                                onChange={e => handleCustomChange('month', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-white dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none"
                            >
                                <option value="*">每月</option>
                                {generateOptions(1, 12).map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}月</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                星期 (0-6)
                            </label>
                            <select
                                value={customCron.weekday}
                                onChange={e => handleCustomChange('weekday', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-white dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none"
                            >
                                <option value="*">每天</option>
                                <option value="0">周日</option>
                                <option value="1">周一</option>
                                <option value="2">周二</option>
                                <option value="3">周三</option>
                                <option value="4">周四</option>
                                <option value="5">周五</option>
                                <option value="6">周六</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">生成的 CRON 表达式：</div>
                        <div className="font-mono text-sm text-gray-800 dark:text-white">
                            {customCron.minute} {customCron.hour} {customCron.day} {customCron.month} {customCron.weekday}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
