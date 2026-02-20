import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Editor from '@monaco-editor/react'
import { IconPlus, IconTrash, IconEdit, IconPlay, IconX, IconInfo } from '../components/icons'
import CronSelector from '../components/CronSelector'
import { noAuthFetch } from '../utils/api'
import { addToast } from '../hooks/useToast'
import type { Rule, GroupInfo } from '../types'

export default function RulesPage() {
    const [rules, setRules] = useState<Rule[]>([])
    const [groups, setGroups] = useState<GroupInfo[]>([])
    const [loading, setLoading] = useState(true)
    const [editingRule, setEditingRule] = useState<Partial<Rule> | null>(null)
    const [showModal, setShowModal] = useState(false)

    const fetchData = async () => {
        try {
            const [rulesRes, groupsRes] = await Promise.all([
                noAuthFetch<Rule[]>('/rules'),
                noAuthFetch<GroupInfo[]>('/groups')
            ])
            setRules(rulesRes.data || [])
            setGroups(groupsRes.data || [])
        } catch (e) {
            addToast('获取数据失败: ' + e, 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleSave = async () => {
        if (!editingRule) return
        if (!editingRule.name) return addToast('请输入规则名称', 'error')
        if (!editingRule.cron) return addToast('请输入 CRON 表达式', 'error')
        // 允许只填脚本或只填模板，但不能都为空（根据你的业务逻辑调整）
        if (!editingRule.template && !editingRule.script) return addToast('模板和脚本不能同时为空', 'error')

        try {
            await noAuthFetch('/rules', {
                method: 'POST',
                body: JSON.stringify(editingRule)
            })
            addToast('保存成功', 'success')
            setShowModal(false)
            fetchData()
        } catch (e) {
            addToast('保存失败: ' + e, 'error')
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('确定要删除此规则吗？')) return
        try {
            await noAuthFetch('/rules/' + id, { method: 'DELETE' })
            addToast('删除成功', 'success')
            fetchData()
        } catch (e) {
            addToast('删除失败: ' + e, 'error')
        }
    }

    const handleTest = async (rule: Partial<Rule>) => {
        try {
            const res = await noAuthFetch<string>('/rules/test', {
                method: 'POST',
                body: JSON.stringify(rule)
            })
            alert(`测试结果: ${res.data}`)
        } catch (e) {
            alert('测试失败: ' + e)
        }
    }

    const openEdit = (rule?: Rule) => {
        if (rule) {
            setEditingRule({ ...rule })
        } else {
            setEditingRule({
                name: '',
                cron: '0 0 * * *', // Every day at midnight
                targetGroups: [],
                template: '',
                script: '',
                enabled: true,
                priority: 0
            })
        }
        setShowModal(true)
    }

    if (loading) return <div className="p-8 text-center text-gray-500">加载中...</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <button
                    onClick={() => openEdit()}
                    className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors shadow-sm"
                >
                    <IconPlus size={20} />
                    <span>新建规则</span>
                </button>
            </div>

            <div className="grid gap-4">
                {rules.map(rule => (
                    <div key={rule.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h3 className="font-semibold text-lg text-gray-800 dark:text-white">{rule.name}</h3>
                                    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${rule.enabled ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                                        {rule.enabled ? '启用' : '禁用'}
                                    </span>
                                </div>
                                <div className="mt-2 flex items-center gap-3">
                                    <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded border dark:border-gray-600">
                                        {rule.cron}
                                    </span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        应用群组: {rule.targetGroups.length} 个
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleTest(rule)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="测试">
                                    <IconPlay size={18} />
                                </button>
                                <button onClick={() => openEdit(rule)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="编辑">
                                    <IconEdit size={18} />
                                </button>
                                <button onClick={() => handleDelete(rule.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="删除">
                                    <IconTrash size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                {rules.length === 0 && (
                    <div className="text-center py-16 text-gray-400 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                        暂无规则，点击右上角添加
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && editingRule && createPortal(
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm transition-opacity">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <div className="w-full max-w-3xl flex flex-col max-h-[90vh] bg-white rounded-2xl shadow-2xl dark:bg-gray-800 overflow-hidden ring-1 ring-white/10">
                            
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                                    {editingRule.id ? '编辑规则' : '新建规则'}
                                </h3>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                    <IconX size={24} />
                                </button>
                            </div>
                            
                            {/* Body */}
                            <div className="p-6 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
                                {/* Row 1: Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">规则名称</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                                        value={editingRule.name}
                                        onChange={e => setEditingRule({ ...editingRule, name: e.target.value })}
                                        placeholder="例如：每日倒计时"
                                    />
                                </div>

                                {/* Row 2: CRON */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">CRON 表达式</label>
                                    <CronSelector
                                        value={editingRule.cron || ''}
                                        onChange={value => setEditingRule({ ...editingRule, cron: value })}
                                    />
                                </div>

                                {/* Row 2: Target Groups */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">目标群组</label>
                                    <div className="border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-900/50 dark:border-gray-700 max-h-40 overflow-y-auto p-2">
                                        {groups.length === 0 ? (
                                            <div className="text-sm text-gray-400 p-2 text-center">暂无可用群组</div>
                                        ) : (
                                            groups.map(g => (
                                                <label key={g.group_id} className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-gray-800 rounded-md cursor-pointer transition-colors group">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500 dark:bg-gray-700 dark:border-gray-600"
                                                        checked={editingRule.targetGroups?.includes(String(g.group_id))}
                                                        onChange={e => {
                                                            const id = String(g.group_id)
                                                            const newGroups = e.target.checked
                                                                ? [...(editingRule.targetGroups || []), id]
                                                                : (editingRule.targetGroups || []).filter(gid => gid !== id)
                                                            setEditingRule({ ...editingRule, targetGroups: newGroups })
                                                        }}
                                                    />
                                                    <span className="text-sm text-gray-700 dark:text-gray-200 font-medium">{g.group_name}</span>
                                                    <span className="text-xs text-gray-400 font-mono group-hover:text-gray-500">({g.group_id})</span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Row 3: Editor (The main change) */}
                                <div>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">JavaScript 脚本 (可选)</label>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">ES6 Supported</span>
                                        </div>
                                    </div>
                                    <div className="h-64 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden relative shadow-inner">
                                        <Editor
                                            height="100%"
                                            defaultLanguage="javascript"
                                            theme="vs-dark" // 使用 VS Code 深色主题，适合写代码
                                            value={editingRule.script}
                                            onChange={(value) => setEditingRule({ ...editingRule, script: value || '' })}
                                            options={{
                                                minimap: { enabled: false }, // 关闭右侧缩略图节省空间
                                                fontSize: 13,
                                                lineNumbers: 'on',
                                                scrollBeyondLastLine: false,
                                                automaticLayout: true,
                                                tabSize: 2,
                                                wordWrap: 'on',
                                                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace",
                                                contextmenu: false, // 简化右键菜单
                                            }}
                                        />
                                    </div>
                                    <div className="flex gap-1.5 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        <IconInfo size={14} className="flex-shrink-0 mt-0.5 text-blue-500" />
                                        <span>支持 Date, Math 等内置对象。返回对象可传入模板，或直接返回字符串作为群名。</span>
                                    </div>
                                </div>

                                {/* Row 4: Template */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">群名模板</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                                        value={editingRule.template}
                                        onChange={e => setEditingRule({ ...editingRule, template: e.target.value })}
                                        placeholder="距离高考还有${days}天"
                                    />
                                </div>

                                {/* Row 5: Switch */}
                                <div className="flex items-center gap-3 pt-2">
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={editingRule.enabled}
                                        onClick={() => setEditingRule({ ...editingRule, enabled: !editingRule.enabled })}
                                        className={`${
                                            editingRule.enabled ? 'bg-pink-500' : 'bg-gray-200 dark:bg-gray-700'
                                        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={`${
                                                editingRule.enabled ? 'translate-x-5' : 'translate-x-0'
                                            } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                                        />
                                    </button>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {editingRule.enabled ? '规则已启用' : '规则已禁用'}
                                    </span>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 bg-gray-50/50 dark:bg-gray-800/50">
                                <button
                                    onClick={() => handleTest(editingRule)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
                                >
                                    测试脚本
                                </button>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-4 py-2 text-sm font-medium text-white bg-pink-500 rounded-lg hover:bg-pink-600 shadow-md shadow-pink-500/20 transition-all"
                                >
                                    保存规则
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}