# codemod-shims.ps1 — data/*.ts 转发 shim 存量消费方机械扫尾（config-json-migration 批次④）
# 法则：值 → configs/loaders|constants|seed、类型 → configs/types、运行时函数 → src/state。
# 策略：按导入符号路由（同一 shim 的不同符号去向不同家）；逐文件合并为最少 import 语句。
$ErrorActionPreference = 'Stop'
$root = 'E:\系统\文档\GitHub\IdleCozyGame'
$src  = Join-Path $root 'src'

$map = @{}
function Add-Syms([string]$csv, [string]$target, [string]$kind) {
  foreach ($n in ($csv -split ',')) { $t = $n.Trim(); if ($t) { $script:map[$t] = @{ target = $target; kind = $kind } } }
}

# --- 值（装配/常量/种子/运行时） ---
Add-Syms 'INITIAL_PLAYER_STATS,createInitialHero,INITIAL_HEROES,INITIAL_STATE' 'configs/seed/initialState' 'V'
Add-Syms 'getMainlineRegions,getRegion,getRegionLevels,getLevel,findRegionIdByExpedition,findRegionExpedition,getTestRegions,findRegionByLevelId' 'state/regionSelectors' 'V'
Add-Syms 'ENEMY_CONFIGS,SURVIVORS_CONFIG,STARTER_HERO_ID,HEROES_CONFIG,AWAKEN_CONFIG,HERO_TALENTS' 'configs/loaders/entities.loader' 'V'
Add-Syms 'HERO_CLASS_LABELS,HERO_CLASS_COLORS,HERO_FACTION_LABELS,PRIMARY_STAT_DESCRIPTIONS' 'configs/constants/heroDisplay' 'V'
Add-Syms 'STAR_MAX,starUpShardCost,STAR_STATS_PER_STAR,AWAKEN_COST' 'configs/constants/awakeningConstants' 'V'
Add-Syms 'formatTalentGate,buildTalentTree' 'state/talentsTree' 'V'
Add-Syms 'TALENT_TRUNKS,BONDS,HERO_GROWTH_BY_CLASS' 'configs/loaders/progression.loader' 'V'
Add-Syms 'getHeroGrowth,getLevelMilestoneBonus,getMilestoneModifiers,heroBaseAttributes' 'state/heroGrowth' 'V'
Add-Syms 'ABILITY_CONFIGS,BASIC_ATTACK,getAbilityConfig' 'configs/loaders/combat.loader' 'V'
Add-Syms 'REALITY_EVENTS,DREAM_EVENTS,RESCUE_EVENTS,RESCUE_LOCATION_MAP,RESCUE_LOCATION_NAMES' 'configs/loaders/event.loader' 'V'
Add-Syms 'CATEGORY_WEIGHTS' 'configs/constants/eventWeights' 'V'
Add-Syms 'FACILITIES_CONFIG,isFacilityType,SHELTER_UPGRADES' 'configs/loaders/shelter.loader' 'V'
Add-Syms 'RECIPES_CONFIG,AUTO_RECIPES' 'configs/loaders/workshop.loader' 'V'
Add-Syms 'ITEMS_CONFIG,ITEM_CATEGORIES' 'configs/loaders/items.loader' 'V'
Add-Syms 'EQUIPMENT_SETS,EQUIPMENT_CONFIG,EQUIPMENT_LIST' 'configs/loaders/equipment.loader' 'V'
Add-Syms 'ENHANCE_MAX,MYTHIC_STAT_MULTIPLIER,FACTION_EQUIPMENT_BONUS_MULTIPLIER,FACTION_EQUIPMENT_BONUS_PERCENT,enhanceCost,FORGE_COST,EQUIPMENT_SLOTS,EQUIPMENT_SLOT_LABELS' 'configs/constants/equipmentConstants' 'V'

# --- 类型（configs/types 收口） ---
Add-Syms 'HeroConfig,DutyScope,DutyBonus,HeroDutyMeta,SurvivorConfig,AwakenConfig' 'configs/types/entity.types' 'T'
Add-Syms 'TalentNodeConfig,TalentGate,BondConfig' 'configs/types/progression.types' 'T'
Add-Syms 'DreamEventType,DreamChoice,DreamEvent,RealityEventType,EventChoice,EncounterBattleConfig,RealityEvent' 'configs/types/event.types' 'T'
Add-Syms 'ItemCategory,ItemMeta,ItemSheet,ItemSprite' 'configs/types/item.types' 'T'
Add-Syms 'SetTierEffect,EquipmentSetConfig,EquipmentConfig' 'configs/types/equipment.types' 'T'
Add-Syms 'FacilityType,FacilityConfig,FacilityExpansionConfig' 'configs/types/gameplay.types' 'T'

$files = Get-ChildItem -Path $src -Recurse -Include *.ts,*.tsx -File | Where-Object { $_.FullName -notlike "$src\data*" }
$regex = [regex]'(?s)import\s+(type\s+)?\{([^}]*)\}\s*from\s*[''\"]([^''\"]+)[''\"]\s*;'
$changed = 0; $skippedSame = 0; $errors = New-Object System.Collections.Generic.List[string]

foreach ($f in $files) {
  $content = [System.IO.File]::ReadAllText($f.FullName)
  $fileDir = Split-Path $f.FullName -Parent
  $matchesList = @($regex.Matches($content) | Where-Object {
      $mod = $_.Groups[3].Value
      if ($mod -notmatch '^\.{1,2}/') { return $false }
      $full = [System.IO.Path]::GetFullPath((Join-Path $fileDir ($mod -replace '/', '\')))
      return $full.StartsWith((Join-Path $src 'data') + '\')
    })
  if ($matchesList.Count -eq 0) { continue }

  # 解析每个合格 import 的符号并路由
  $routed = New-Object System.Collections.Generic.List[object]   # {sym,target,kind,order}
  $spans   = New-Object System.Collections.Generic.List[object]  # {start,len}
  $order = 0
  foreach ($m in $matchesList) {
    $stmtType = -not [string]::IsNullOrWhitespace($m.Groups[1].Value)
    $specs = $m.Groups[2].Value -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ }
    foreach ($spec in $specs) {
      $inlineType = $false
      if ($spec -match '^type\s+(.+)$') { $inlineType = $true; $symName = $Matches[1].Trim() } else { $symName = $spec }
      if (-not $map.ContainsKey($symName)) {
        $errors.Add("UNKNOWN SYMBOL '$symName' in $($f.FullName)")
        continue
      }
      $route = $map[$symName]
      $isType = $stmtType -or $inlineType -or ($route.kind -eq 'T')
      if ($stmtType -and $route.kind -eq 'V') { $errors.Add("TYPE-STMT over VALUE symbol '$symName' in $($f.FullName)") }
      $routed.Add([pscustomobject]@{ sym = $symName; target = $route.target; isType = $isType; order = $order })
      $order++
    }
    $spans.Add([pscustomobject]@{ start = $m.Index; len = $m.Length })
  }
  if ($errors.Count -gt 0) { break }

  # 按 target 分组（保持首次出现顺序），组内按符号首现排序
  $groups = $routed | Group-Object target | ForEach-Object {
    $first = ($_.Group | Sort-Object order | Select-Object -First 1).order
    [pscustomobject]@{ target = $_.Name; first = $first; items = ($_.Group | Sort-Object order) }
  } | Sort-Object first

  $blockParts = @()
  foreach ($g in $groups) {
    $targetFull = Join-Path $src (($g.target -replace '/', '\'))
    $rel = ([System.IO.Path]::GetRelativePath($fileDir, $targetFull)) -replace '\\', '/'
    if (-not $rel.StartsWith('.')) { $rel = "./$rel" }
    $vals = @($g.items | Where-Object { -not $_.isType } | ForEach-Object sym)
    $typs = @($g.items | Where-Object { $_.isType } | ForEach-Object sym)
    if ($vals.Count -gt 0) { $blockParts += "import { $($vals -join ', ') } from '$rel';" }
    if ($typs.Count -gt 0) { $blockParts += "import type { $($typs -join ', ') } from '$rel';" }
  }
  $block = $blockParts -join "`n"

  # 从后往前替换：第一处放合并块，其余删除
  $ordered = $spans | Sort-Object start -Descending
  $newContent = $content
  for ($i = 0; $i -lt $ordered.Count; $i++) {
    $s = $ordered[$i]
    $replacement = if ($i -eq $ordered.Count - 1) { $block } else { '' }
    $newContent = $newContent.Remove($s.start, $s.len).Insert($s.start, $replacement)
  }
  $newContent = [regex]::Replace($newContent, "\r?\n{3,}", "`n`n")

  if ($newContent -ne $content) {
    [System.IO.File]::WriteAllText($f.FullName, $newContent, [System.Text.UTF8Encoding]::new($false))
    $changed++
  } else { $skippedSame++ }
}

if ($errors.Count -gt 0) { Write-Host "ABORT — 未写任何未知路由："; $errors | ForEach-Object { Write-Host "  $_" }; exit 1 }
Write-Host "rewritten=$changed unchanged=$skippedSame"
