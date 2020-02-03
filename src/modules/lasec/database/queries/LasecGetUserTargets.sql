SELECT
  staff.staffuserid as staffUserId,
  staff.first_name as firstName,
  staff.surname as lastName,
  staff.email,
  staff.branch as staffBranch,
  staff.live_company,
  CONCAT('SysproCompany', staff.live_company) as liveSysproCompany,
  target.SysproCompany as sysproCompany,
  target.Salesperson as teamId,
  target.Branch as teamBranch, 
  target.Name, 
  target.SalesBudget1,
  target.SalesBudget2,
  target.SalesBudget3,
  target.SalesBudget4,
  target.SalesBudget5,
  target.SalesBudget6,
  target.SalesBudget7,
  target.SalesBudget8,
  target.SalesBudget9,
  target.SalesBudget10,
  target.SalesBudget11,
  target.SalesBudget12
FROM SalSalesperson as target 
  INNER JOIN StaffUser staff ON target.SalesPerson = staff.sales_team_id
      WHERE target.SysproCompany = CONCAT('SysproCompany', staff.live_company)
      AND staff.staffuserid IN (${staffuserids})
          ORDER BY staff.surname, staff.first_name