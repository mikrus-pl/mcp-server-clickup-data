// src/utils/cdcOutputParser.js

function parseSyncUsersOutput(stdout, stderr) {
    const result = {
      fetchedFromClickUp: null,
      foundInClickUp: null,
      newInDb: null,
      updatedInDb: null,
      warnings: [],
      rawStdout: stdout,
    };
  
    let match;
    if (match = stdout.match(/Fetched (\d+) unique users from ClickUp/i)) result.fetchedFromClickUp = parseInt(match[1]);
    if (match = stdout.match(/Found (\d+) users in ClickUp/i)) result.foundInClickUp = parseInt(match[1]);
    if (match = stdout.match(/Synchronization complete: (\d+) new users, (\d+) updated users/i)) {
      result.newInDb = parseInt(match[1]);
      result.updatedInDb = parseInt(match[2]);
    }
    // Można dodać parsowanie warningów ze stderr, jeśli są specyficzne
    return result;
  }
  
  function parseSyncTasksOutput(stdout, stderr) {
    const result = {
      totalFetchedApi: null, // Total tasks (including subtasks)
      processedNew: null,
      processedUpdated: null,
      parentSubtaskWarnings: 0,
      warnings: [],
      rawStdout: stdout,
    };
  
    let match;
    if (match = stdout.match(/Total tasks \(including subtasks\): (\d+)/i)) result.totalFetchedApi = parseInt(match[1]);
    // if (match = stdout.match(/Fetched (\d+) tasks \(including subtasks\) from ClickUp/i)) result.totalFetchedApi = parseInt(match[1]); // Alternatywa
    if (match = stdout.match(/Task processing complete: (\d+) new tasks, (\d+) updated tasks/i)) {
      result.processedNew = parseInt(match[1]);
      result.processedUpdated = parseInt(match[2]);
    }
    
    const warningRegex = /Warning: Subtask \S+ \(name: "[^"]+"\) is marked as 'Parent'/gi;
    while ((match = warningRegex.exec(stdout)) !== null) {
      result.parentSubtaskWarnings++;
      result.warnings.push(match[0]);
    }
    if (stderr) result.warnings.push(...stderr.split('\n').filter(line => line.trim() !== ''));
  
    return result;
  }
  
  function parseGenerateAggregatesOutput(stdout, stderr) {
    const result = {
      tasksFetchedDb: null,
      parentTasksToProcess: null,
      parentTasksSkippedNoAssignee: 0, // Inicjalizujemy, bo może nie być w logu jeśli wszystko ok
      aggregatesGeneratedUniqueParent: null,
      aggregateRowsWritten: null,
      warnings: [],
      rawStdout: stdout,
    };
  
    let match;
    if (match = stdout.match(/Fetched (\d+) tasks from DB/i)) result.tasksFetchedDb = parseInt(match[1]);
    // Pierwsze wystąpienie "Found X parent tasks to process"
    if (match = stdout.match(/Found (\d+) parent tasks to process based on list criteria/i)) result.parentTasksToProcess = parseInt(match[1]);
  
    // Zliczanie warningów o braku assignee
    const skippedRegex = /Parent task \S+ \(Name: "[^"]+"\) has no assignees.*?Skipping/gi;
     while ((match = skippedRegex.exec(stdout)) !== null) {
      result.parentTasksSkippedNoAssignee++;
    }
  
    // Z podsumowania (jeśli jest - dla pewności)
    if (match = stdout.match(/Total "Parent" tasks found matching criteria: (\d+)/i)) result.parentTasksToProcess = parseInt(match[1]);
    if (match = stdout.match(/"Parent" tasks skipped \(no assignees found in DB\): (\d+)/i)) result.parentTasksSkippedNoAssignee = parseInt(match[1]); // Nadpisze zliczone, jeśli jest w podsumowaniu
  
    if (match = stdout.match(/Unique "Parent" tasks for which aggregates were generated\/updated: (\d+)/i)) result.aggregatesGeneratedUniqueParent = parseInt(match[1]);
    if (match = stdout.match(/Total aggregate rows written to ReportedTaskAggregates: (\d+)/i)) result.aggregateRowsWritten = parseInt(match[1]);
    
    // Alternatywnie z linii "Preparing to insert/update X aggregate entries (for Y unique parent tasks..."
    if (!result.aggregateRowsWritten || !result.aggregatesGeneratedUniqueParent) {
      if (match = stdout.match(/Preparing to insert\/update (\d+) aggregate entries \(for (\d+) unique parent tasks/i)) {
          if (!result.aggregateRowsWritten) result.aggregateRowsWritten = parseInt(match[1]);
          if (!result.aggregatesGeneratedUniqueParent) result.aggregatesGeneratedUniqueParent = parseInt(match[2]);
      } else if (match = stdout.match(/(\d+) aggregate entries processed successfully/i) && !result.aggregateRowsWritten) {
          result.aggregateRowsWritten = parseInt(match[1]);
      }
    }
  
  
    if (stderr) result.warnings.push(...stderr.split('\n').filter(line => line.trim() !== ''));
  
    return result;
  }
  
  function parseSetUserRateOutput(stdout, stderr) {
      // Komenda user-rate set w CDC nie ma wielu specyficznych outputów liczbowych,
      // ale możemy sprawdzić, czy nie ma błędów
      const result = {
          message: stdout.trim(), // Cały stdout jako wiadomość
          warnings: []
      };
      if (stderr) result.warnings.push(...stderr.split('\n').filter(line => line.trim() !== ''));
      return result;
  }
  
  function parsePurgeDataOutput(stdout, stderr) {
      const result = {
          message: stdout.trim(),
          warnings: []
      };
       if (stdout.includes("All data has been purged")) {
          result.purged = true;
      } else {
          result.purged = false;
      }
      if (stderr) result.warnings.push(...stderr.split('\n').filter(line => line.trim() !== ''));
      return result;
  }
  
  
  module.exports = {
    parseSyncUsersOutput,
    parseSyncTasksOutput,
    parseGenerateAggregatesOutput,
    parseSetUserRateOutput,
    parsePurgeDataOutput,
  };