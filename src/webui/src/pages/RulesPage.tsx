
import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconPlus, IconTrash, IconEdit, IconPlay, IconCheck, IconX, IconInfo } from '../components/icons'
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
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">规则管理</h2>
                    <p className="text-gray-500 dark:text-gray-400">配置定时修改群名规则</p>
                </div>
                <button
                    onClick={() => openEdit()}
                    className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
                >
                    <IconPlus size={20} />
                    <span>新建规则</span>
                </button>
            </div>

            <div className="grid gap-4">
                {rules.map(rule => (
                    <div key={rule.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-lg text-gray-800 dark:text-white">{rule.name}</h3>
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${rule.enabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                        {rule.enabled ? '启用' : '禁用'}
                                    </span>
                                </div>
                                <div className="mt-1 text-sm text-gray-500 font-mono bg-gray-50 dark:bg-gray-900 inline-block px-2 py-0.5 rounded">
                                    {rule.cron}
                                </div>
                                <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                    应用群组: {rule.targetGroups.length} 个
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleTest(rule)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title="测试">
                                    <IconPlay size={18} />
                                </button>
                                <button onClick={() => openEdit(rule)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="编辑">
                                    <IconEdit size={18} />
                                </button>
                                <button onClick={() => handleDelete(rule.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg" title="删除">
                                    <IconTrash size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                {rules.length === 0 && (
                    <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                        暂无规则，点击右上角添加
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && editingRule && createPortal(
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <div className="w-full max-w-2xl flex flex-col max-h-[85vh] bg-white rounded-xl shadow-xl dark:bg-gray-800 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                                    {editingRule.id ? '编辑规则' : '新建规则'}
                                </h3>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <IconX />
                                </button>
                            </div>
                            
                            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">规则名称</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                            value={editingRule.name}
                                            onChange={e => setEditingRule({ ...editingRule, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CRON 表达式</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 font-mono"
                                            value={editingRule.cron}
                                            onChange={e => setEditingRule({ ...editingRule, cron: e.target.value })}
                                            placeholder="* * * * *"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">目标群组</label>
                                    <div className="border rounded-lg dark:bg-gray-700 dark:border-gray-600 max-h-40 overflow-y-auto p-2">
                                        {groups.map(g => (
                                            <label key={g.group_id} className="flex items-center gap-2 p-1 hover:bg-gray-50 dark:hover:bg-gray-600 rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={editingRule.targetGroups?.includes(String(g.group_id))}
                                                    onChange={e => {
                                                        const id = String(g.group_id)
                                                        const newGroups = e.target.checked
                                                            ? [...(editingRule.targetGroups || []), id]
                                                            : (editingRule.targetGroups || []).filter(gid => gid !== id)
                                                        setEditingRule({ ...editingRule, targetGroups: newGroups })
                                                    }}
                                                />
                                                <span className="text-sm">{g.group_name} ({g.group_id})</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">JavaScript 脚本 (可选)</label>
                                    <textarea
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 font-mono text-sm"
                                        rows={4}
                                        value={editingRule.script}
                                        onChange={e => setEditingRule({ ...editingRule, script: e.target.value })}
                                        placeholder="// const days = ...; return { days }; 或直接 return '群名';"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        支持 Date, Math 等内置对象。返回对象可用于模板变量，返回字符串直接作为群名。
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">群名模板</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                        value={editingRule.template}
                                        onChange={e => setEditingRule({ ...editingRule, template: e.target.value })}
                                        placeholder="距离高考还有${days}天"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="enabled"
                                        checked={editingRule.enabled}
                                        onChange={e => setEditingRule({ ...editingRule, enabled: e.target.checked })}
                                    />
                                    <label htmlFor="enabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">启用此规则</label>
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 flex-shrink-0">
                                <button
                                    onClick={() => handleTest(editingRule)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    测试脚本
                                </button>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
                                >
                                    保存
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
