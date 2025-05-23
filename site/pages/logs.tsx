import { useCommand } from '@anaisbetts/commands'
import { ChevronDown, ChevronRight, RotateCw, Search } from 'lucide-react'
import { DateTime } from 'luxon'
import { useEffect, useMemo, useState } from 'react'
import { firstValueFrom } from 'rxjs'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { AutomationLogEntry, SignalData } from '../../shared/types'
import { ChatMessage } from '../components/chat-message'
import { Badge } from '../components/ui/badge'
import { useWebSocket } from '../components/ws-provider'

export default function Logs() {
  const [searchText, setSearchText] = useState('')
  const [selectedType, setSelectedType] = useState<string>('All Types')
  const [logs, setLogs] = useState<AutomationLogEntry[]>([])
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())
  const { api } = useWebSocket()

  // Define a command to fetch logs
  const [fetchLogsCmd, fetchLogsResult] = useCommand(async () => {
    if (!api) return []
    const result = await firstValueFrom(api.getAutomationLogs())
    setLogs(result)
    return result
  }, [api])

  // Fetch logs on component mount if API is available
  useEffect(() => {
    if (api) {
      void fetchLogsCmd()
    }
  }, [api, fetchLogsCmd])

  const toggleExpanded = (id: number) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const refreshLogs = () => void fetchLogsCmd()

  const filteredLogs = useMemo(() => {
    return logs
      .filter((log) => {
        // Filter by search text
        if (searchText) {
          const searchLower = searchText.toLowerCase()
          const logString = JSON.stringify(log).toLowerCase()
          if (!logString.includes(searchLower)) return false
        }

        // Filter by type
        if (selectedType !== 'All Types' && log.type !== selectedType) {
          return false
        }

        return true
      })
      .sort(
        (a, b) =>
          DateTime.fromISO(b.createdAt).toUnixInteger() -
          DateTime.fromISO(a.createdAt).toUnixInteger()
      )
  }, [logs, searchText, selectedType])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-border border-b p-4">
        <h2 className="font-semibold text-lg">Automation Logs</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={refreshLogs}>
            <RotateCw size={18} />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 border-b p-4">
        <div className="relative flex-1">
          <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            className="pl-8"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All Types">All Types</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="determine-signal">Determine Signal</SelectItem>
            <SelectItem value="execute-signal">Execute Signal</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          onClick={() => {
            setSearchText('')
            setSelectedType('All Types')
          }}
        >
          Reset Filters
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {fetchLogsResult.isPending() ? (
          <div className="flex justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No logs found
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log, index) => (
              <LogEntry
                key={index}
                log={log}
                isExpanded={
                  expandedItems.has(index) || filteredLogs.length === 1
                }
                onToggleExpand={() => toggleExpanded(index)}
                formattedDate={DateTime.fromISO(log.createdAt).toLocaleString(
                  DateTime.DATETIME_MED_WITH_SECONDS
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SignalInfo({ signal }: { signal: SignalData | null }) {
  if (!signal) return null

  switch (signal.type) {
    case 'cron':
      return (
        <div className="ml-8 text-muted-foreground text-sm">
          <span className="font-semibold">Cron Schedule:</span> {signal.cron}
        </div>
      )
    case 'state':
      return (
        <div className="ml-8 text-muted-foreground text-sm">
          <span className="font-semibold">State Change:</span>{' '}
          {signal.entityIds.join(', ')}
          <span className="ml-2 text-xs">(regex: {signal.regex})</span>
        </div>
      )
    case 'offset':
      return (
        <div className="ml-8 text-muted-foreground text-sm">
          <span className="font-semibold">Time Offset:</span>{' '}
          {signal.offsetInSeconds}s
        </div>
      )
    case 'time':
      return (
        <div className="ml-8 text-muted-foreground text-sm">
          <span className="font-semibold">Scheduled Time:</span>{' '}
          {signal.iso8601Time}
        </div>
      )
    default:
      return null
  }
}

interface LogEntryProps {
  log: AutomationLogEntry
  isExpanded: boolean
  onToggleExpand: () => void
  formattedDate: string
}

function LogEntry({
  log,
  isExpanded,
  onToggleExpand,
  formattedDate,
}: LogEntryProps) {
  const typeBadge = useMemo(() => {
    switch (log.type) {
      case 'manual':
        return <Badge variant="default">manual</Badge>
      case 'chat':
        return <Badge variant="default">chat</Badge>
      case 'determine-signal':
        return <Badge variant="secondary">determine-signal</Badge>
      case 'execute-signal':
        return <Badge variant="outline">execute-signal</Badge>
      default:
        return <Badge>{log.type}</Badge>
    }
  }, [log])

  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={onToggleExpand}
      className="rounded-md border"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between p-4 text-left">
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          {typeBadge}
        </div>
        <div className="font-medium text-sm">{formattedDate}</div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="space-y-2 p-4 pt-0">
          {log.automation && (
            <div className="ml-6 text-sm">
              <span className="font-semibold">Automation:</span>{' '}
              {log.automation.fileName}
              <div className="mt-1 font-mono text-muted-foreground text-xs">
                # {log.automation.hash}
              </div>
            </div>
          )}

          {log.signaledBy && <SignalInfo signal={log.signaledBy} />}

          {log.messages && log.messages.length > 0 && (
            <div className="mt-4 ml-6">
              <div className="mb-2 font-semibold">Messages:</div>
              <div className="space-y-2">
                {log.messages.map((msg, i) => (
                  <ChatMessage
                    key={i}
                    msg={msg}
                    isLast={i === log.messages.length - 1}
                  />
                ))}
              </div>
            </div>
          )}

          {log.servicesCalled && log.servicesCalled.length > 0 && (
            <div className="mt-4 ml-6">
              <div className="mb-2 font-semibold">Services Called:</div>
              {log.servicesCalled.map((service, i) => (
                <div key={i} className="ml-2 border-l-2 py-1 pl-3 text-sm">
                  <div>
                    <span className="font-medium">{service.service}</span> @{' '}
                    {DateTime.fromISO(service.createdAt).toLocaleString(
                      DateTime.DATETIME_MED_WITH_SECONDS
                    )}
                  </div>
                  <div className="mt-1 font-mono text-xs">
                    {service.target} {service.data && `Data: ${service.data}`}
                  </div>
                </div>
              ))}
            </div>
          )}

          {log.images && log.images.length > 0 && (
            <div className="mt-4 ml-6">
              <div className="mb-2 font-semibold">Referenced Images:</div>
              <div className="flex flex-wrap gap-4">
                {log.images.map((base64Image, i) => {
                  const imageUrl = `data:image/jpeg;base64,${base64Image}`
                  return <ImageModal key={i} imageUrl={imageUrl} />
                })}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

interface ImageModalProps {
  imageUrl: string
}

function ImageModal({ imageUrl }: ImageModalProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <div className="cursor-pointer rounded-md border p-2 transition-all hover:shadow-md">
          <img
            src={imageUrl}
            alt="Image thumbnail"
            style={{ height: '100px', objectFit: 'contain' }}
            className="rounded"
          />
        </div>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-4xl">
        <div className="flex items-center justify-center">
          <img
            src={imageUrl}
            alt="Full-size image"
            className="max-h-[85vh] max-w-full rounded object-contain"
          />
        </div>

        <div className="flex justify-end">
          <AlertDialogCancel className="mb-2">Close</AlertDialogCancel>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
